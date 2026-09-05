"use server";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface Anomaly {
  id: string;
  type: "grade_drop" | "grade_jump" | "attendance_spike" | "data_error" | "unusual_pattern";
  severity: "low" | "medium" | "high" | "critical";
  studentId: string;
  studentName: string;
  className: string;
  description: string;
  details: string;
  detectedAt: string;
  recommendedAction: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const hasPerm = await hasPermission(session.userId, "analytics.view");
    if (!hasPerm) {
      return NextResponse.json({ error: "analytics.view permission required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const anomalies: Anomaly[] = [];

    // 1. Grade anomalies: sudden drops or jumps
    const { data: assessments } = await admin
      .from("assessments")
      .select("*, subjects(name), students(profile_id, class_id), classes(name)")
      .order("created_at", { ascending: true });

    if (assessments && assessments.length > 0) {
      // Get profiles
      const studentIds = [...new Set(assessments.map((a) => a.student_id).filter(Boolean))];
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      // Group by student
      const studentAssessments: Record<string, typeof assessments> = {};
      for (const a of assessments) {
        if (!a.student_id) continue;
        if (!studentAssessments[a.student_id]) studentAssessments[a.student_id] = [];
        studentAssessments[a.student_id].push(a);
      }

      for (const [studentId, records] of Object.entries(studentAssessments)) {
        if (records.length < 2) continue;

        // Sort by date
        records.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Check for sudden drops (current < previous by > 30%)
        for (let i = 1; i < records.length; i++) {
          const prev = records[i - 1];
          const curr = records[i];
          if (prev.score === null || prev.max_score === null || curr.score === null || curr.max_score === null) continue;

          const prevPct = (prev.score / prev.max_score) * 100;
          const currPct = (curr.score / curr.max_score) * 100;
          const drop = prevPct - currPct;
          const jump = currPct - prevPct;

          if (drop > 30) {
            anomalies.push({
              id: `grade-drop-${studentId}-${i}`,
              type: "grade_drop",
              severity: drop > 50 ? "critical" : "high",
              studentId,
              studentName: profileMap.get(studentId) || "Unknown",
              className: curr.classes?.name || "Unknown",
              description: `Grade dropped ${Math.round(drop)}% in ${curr.subjects?.name || "a subject"}`,
              details: `Previous: ${Math.round(prevPct)}%, Current: ${Math.round(currPct)}%. Student: ${profileMap.get(studentId) || "Unknown"}`,
              detectedAt: curr.created_at,
              recommendedAction: "Verify with teacher for possible data entry error or identify cause of decline.",
            });
          }

          if (jump > 40) {
            anomalies.push({
              id: `grade-jump-${studentId}-${i}`,
              type: "grade_jump",
              severity: jump > 60 ? "high" : "medium",
              studentId,
              studentName: profileMap.get(studentId) || "Unknown",
              className: curr.classes?.name || "Unknown",
              description: `Grade jumped ${Math.round(jump)}% in ${curr.subjects?.name || "a subject"}`,
              details: `Previous: ${Math.round(prevPct)}%, Current: ${Math.round(currPct)}%. Verify for data accuracy.`,
              detectedAt: curr.created_at,
              recommendedAction: "Verify score accuracy with teacher. Could indicate data entry error.",
            });
          }
        }

        // Check for data errors: max_score = 0 or score > max_score
        for (const a of records) {
          if (a.max_score === 0) {
            anomalies.push({
              id: `data-error-${a.id}`,
              type: "data_error",
              severity: "high",
              studentId,
              studentName: profileMap.get(studentId) || "Unknown",
              className: a.classes?.name || "Unknown",
              description: `Invalid max score (0) in ${a.subjects?.name || "subject"}`,
              details: `Assessment ID: ${a.id}. Max score is 0, which is invalid.`,
              detectedAt: a.created_at,
              recommendedAction: "Correct the max score in the gradebook immediately.",
            });
          }
          if (a.score !== null && a.max_score !== null && a.score > a.max_score) {
            anomalies.push({
              id: `data-error-score-${a.id}`,
              type: "data_error",
              severity: "critical",
              studentId,
              studentName: profileMap.get(studentId) || "Unknown",
              className: a.classes?.name || "Unknown",
              description: `Score exceeds max score in ${a.subjects?.name || "subject"}`,
              details: `Score: ${a.score}, Max: ${a.max_score}. Assessment ID: ${a.id}.`,
              detectedAt: a.created_at,
              recommendedAction: "URGENT: Score cannot exceed max score. Verify and correct immediately.",
            });
          }
        }
      }
    }

    // 2. Attendance anomalies: sudden spikes in absences
    const { data: attendance } = await admin
      .from("attendance")
      .select("*, students(profile_id, class_id), classes(name)")
      .order("date", { ascending: true });

    if (attendance && attendance.length > 0) {
      const studentIds = [...new Set(attendance.map((a) => a.student_id).filter(Boolean))];
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);
      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      const studentAttendance: Record<string, Array<{ date: string; status: string }>> = {};
      for (const a of attendance) {
        if (!a.student_id) continue;
        if (!studentAttendance[a.student_id]) studentAttendance[a.student_id] = [];
        studentAttendance[a.student_id].push({ date: a.date, status: a.status });
      }

      for (const [studentId, records] of Object.entries(studentAttendance)) {
        if (records.length < 5) continue;

        // Check for sudden absence spikes: 3+ consecutive absences
        let consecutiveAbsences = 0;
        let maxConsecutive = 0;
        for (const r of records) {
          if (r.status === "absent") {
            consecutiveAbsences++;
            maxConsecutive = Math.max(maxConsecutive, consecutiveAbsences);
          } else {
            consecutiveAbsences = 0;
          }
        }

        if (maxConsecutive >= 3) {
          const record = attendance.find((a) => a.student_id === studentId);
          anomalies.push({
            id: `attendance-spike-${studentId}`,
            type: "attendance_spike",
            severity: maxConsecutive >= 5 ? "critical" : "high",
            studentId,
            studentName: profileMap.get(studentId) || "Unknown",
            className: record?.classes?.name || "Unknown",
            description: `${maxConsecutive} consecutive absences detected`,
            details: `Student has been absent for ${maxConsecutive} consecutive sessions.`,
            detectedAt: new Date().toISOString(),
            recommendedAction: "Contact parents immediately. Investigate health or family issues.",
          });
        }

        // Check for unusual pattern: all records are same status (possible data entry error)
        const allSame = records.every((r) => r.status === records[0].status);
        if (allSame && records.length > 10) {
          const record = attendance.find((a) => a.student_id === studentId);
          anomalies.push({
            id: `unusual-pattern-${studentId}`,
            type: "unusual_pattern",
            severity: "medium",
            studentId,
            studentName: profileMap.get(studentId) || "Unknown",
            className: record?.classes?.name || "Unknown",
            description: `All ${records.length} attendance records are "${records[0].status}"`,
            details: `Every attendance record for this student has the same status. Possible data entry error or bulk import issue.`,
            detectedAt: new Date().toISOString(),
            recommendedAction: "Verify attendance records. If imported, check source data integrity.",
          });
        }
      }
    }

    // Sort by severity then date
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    anomalies.sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      return sevDiff !== 0 ? sevDiff : new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });

    return NextResponse.json({ anomalies: anomalies.slice(0, 50) });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/analytics/anomalies] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to detect anomalies" }, { status: 500 });
  }
}
