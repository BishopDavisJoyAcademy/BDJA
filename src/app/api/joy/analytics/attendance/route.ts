"use server";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface AttendanceAnalytics {
  summary: {
    totalRecords: number;
    presentRate: number;
    absentRate: number;
    lateRate: number;
    excusedRate: number;
  };
  frequentAbsentees: Array<{
    studentId: string;
    studentName: string;
    className: string;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    attendanceRate: number;
    trend: "improving" | "declining" | "stable";
    riskLevel: "low" | "medium" | "high";
    recommendation: string;
  }>;
  classAttendance: Array<{
    classId: string;
    className: string;
    presentRate: number;
    absentRate: number;
    lateRate: number;
    studentCount: number;
  }>;
  dailyTrend: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
  }>;
  gradeCorrelation: Array<{
    studentId: string;
    studentName: string;
    attendanceRate: number;
    averageGrade: number;
    correlation: "positive" | "negative" | "neutral";
  }>;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const hasPerm = await hasPermission(session.userId, "analytics.view");
    if (!hasPerm) {
      return NextResponse.json({ error: "analytics.view permission required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");
    const days = parseInt(searchParams.get("days") || "30", 10);
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Fetch attendance records
    let attendanceQuery = admin
      .from("attendance")
      .select("*, students(profile_id, class_id, status), classes(name)");

    if (classId) attendanceQuery = attendanceQuery.eq("class_id", classId);

    const { data: attendance, error: attendanceError } = await attendanceQuery;
    if (attendanceError) throw attendanceError;

    if (!attendance || attendance.length === 0) {
      return NextResponse.json({
        summary: { totalRecords: 0, presentRate: 0, absentRate: 0, lateRate: 0, excusedRate: 0 },
        frequentAbsentees: [],
        classAttendance: [],
        dailyTrend: [],
        gradeCorrelation: [],
      } as AttendanceAnalytics);
    }

    // Get student profiles
    const studentIds = [...new Set(attendance.map((a) => a.student_id).filter(Boolean))];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

    // Summary stats
    const total = attendance.length;
    const presentCount = attendance.filter((a) => a.status === "present").length;
    const absentCount = attendance.filter((a) => a.status === "absent").length;
    const lateCount = attendance.filter((a) => a.status === "late").length;
    const excusedCount = attendance.filter((a) => a.status === "excused").length;

    const summary = {
      totalRecords: total,
      presentRate: total > 0 ? Math.round((presentCount / total) * 1000) / 10 : 0,
      absentRate: total > 0 ? Math.round((absentCount / total) * 1000) / 10 : 0,
      lateRate: total > 0 ? Math.round((lateCount / total) * 1000) / 10 : 0,
      excusedRate: total > 0 ? Math.round((excusedCount / total) * 1000) / 10 : 0,
    };

    // Per-student attendance analysis
    const studentAttendance: Record<string, Array<{ status: string; date: string }>> = {};
    for (const a of attendance) {
      if (!a.student_id) continue;
      if (!studentAttendance[a.student_id]) studentAttendance[a.student_id] = [];
      studentAttendance[a.student_id].push({ status: a.status, date: a.date });
    }

    const frequentAbsentees: AttendanceAnalytics["frequentAbsentees"] = [];
    for (const [studentId, records] of Object.entries(studentAttendance)) {
      if (records.length < 3) continue;

      const present = records.filter((r) => r.status === "present").length;
      const absent = records.filter((r) => r.status === "absent").length;
      const late = records.filter((r) => r.status === "late").length;
      const rate = (present / records.length) * 100;

      // Trend analysis: compare first half vs second half
      records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const mid = Math.floor(records.length / 2);
      const firstHalf = records.slice(0, mid);
      const secondHalf = records.slice(mid);
      const firstRate = firstHalf.filter((r) => r.status === "present").length / (firstHalf.length || 1);
      const secondRate = secondHalf.filter((r) => r.status === "present").length / (secondHalf.length || 1);

      const trend: "improving" | "declining" | "stable" =
        secondRate > firstRate + 0.1 ? "improving" :
        secondRate < firstRate - 0.1 ? "declining" : "stable";

      const riskLevel: "low" | "medium" | "high" =
        rate < 70 || (trend === "declining" && rate < 80) ? "high" :
        rate < 85 || trend === "declining" ? "medium" : "low";

      if (riskLevel !== "low" || absent > 2) {
        const record = attendance.find((a) => a.student_id === studentId);
        frequentAbsentees.push({
          studentId,
          studentName: profileMap.get(studentId) || "Unknown",
          className: record?.classes?.name || "Unknown",
          presentCount: present,
          absentCount: absent,
          lateCount: late,
          attendanceRate: Math.round(rate * 10) / 10,
          trend,
          riskLevel,
          recommendation: generateAttendanceRecommendation(rate, trend, absent),
        });
      }
    }

    frequentAbsentees.sort((a, b) => b.absentCount - a.absentCount);

    // Class attendance breakdown
    const classGroups: Record<string, { name: string; records: typeof attendance }> = {};
    for (const a of attendance) {
      if (!a.class_id) continue;
      if (!classGroups[a.class_id]) classGroups[a.class_id] = { name: a.classes?.name || "Unknown", records: [] };
      classGroups[a.class_id].records.push(a);
    }

    const classAttendance: AttendanceAnalytics["classAttendance"] = Object.entries(classGroups).map(([classId, data]) => {
      const total = data.records.length;
      const present = data.records.filter((r) => r.status === "present").length;
      const absent = data.records.filter((r) => r.status === "absent").length;
      const late = data.records.filter((r) => r.status === "late").length;
      const uniqueStudents = new Set(data.records.map((r) => r.student_id)).size;
      return {
        classId,
        className: data.name,
        presentRate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
        absentRate: total > 0 ? Math.round((absent / total) * 1000) / 10 : 0,
        lateRate: total > 0 ? Math.round((late / total) * 1000) / 10 : 0,
        studentCount: uniqueStudents,
      };
    });

    // Daily trend
    const dailyGroups: Record<string, { present: number; absent: number; late: number; excused: number }> = {};
    for (const a of attendance) {
      if (!a.date) continue;
      if (!dailyGroups[a.date]) dailyGroups[a.date] = { present: 0, absent: 0, late: 0, excused: 0 };
      dailyGroups[a.date][a.status as keyof typeof dailyGroups[string]]++;
    }

    const dailyTrend = Object.entries(dailyGroups)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-30)
      .map(([date, counts]) => ({
        date,
        present: counts.present,
        absent: counts.absent,
        late: counts.late,
        excused: counts.excused,
        total: counts.present + counts.absent + counts.late + counts.excused,
      }));

    // Grade correlation: fetch assessments for same students
    const gradeCorrelation: AttendanceAnalytics["gradeCorrelation"] = [];
    if (studentIds.length > 0) {
      const { data: assessments } = await admin
        .from("assessments")
        .select("student_id, score, max_score")
        .in("student_id", studentIds);

      const studentGrades: Record<string, number[]> = {};
      for (const a of assessments || []) {
        if (a.score === null || a.max_score === null) continue;
        if (!studentGrades[a.student_id]) studentGrades[a.student_id] = [];
        studentGrades[a.student_id].push((a.score / a.max_score) * 100);
      }

      for (const [studentId, records] of Object.entries(studentAttendance)) {
        const grades = studentGrades[studentId];
        if (!grades || grades.length === 0) continue;

        const presentRate = (records.filter((r) => r.status === "present").length / records.length) * 100;
        const avgGrade = grades.reduce((s, g) => s + g, 0) / grades.length;

        const correlation: "positive" | "negative" | "neutral" =
          presentRate > 85 && avgGrade > 70 ? "positive" :
          presentRate < 70 && avgGrade < 60 ? "negative" : "neutral";

        gradeCorrelation.push({
          studentId,
          studentName: profileMap.get(studentId) || "Unknown",
          attendanceRate: Math.round(presentRate * 10) / 10,
          averageGrade: Math.round(avgGrade * 10) / 10,
          correlation,
        });
      }
    }

    return NextResponse.json({
      summary,
      frequentAbsentees: frequentAbsentees.slice(0, 20),
      classAttendance,
      dailyTrend,
      gradeCorrelation: gradeCorrelation.slice(0, 20),
    } as AttendanceAnalytics);
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/analytics/attendance] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to analyze attendance" }, { status: 500 });
  }
}

function generateAttendanceRecommendation(rate: number, trend: string, absentCount: number): string {
  if (rate < 70) {
    return `Critical attendance issue. Student has missed ${absentCount} sessions. Recommend: immediate parent contact, investigate barriers to attendance, and develop attendance improvement plan.`;
  }
  if (trend === "declining") {
    return `Attendance is declining. Recommend: early parent communication, identify causes (health/transport/family), and set attendance goals.`;
  }
  if (rate < 85) {
    return `Attendance below target. Recommend: monitor closely, celebrate improvements, and address any underlying issues.`;
  }
  return `Attendance is acceptable. Continue monitoring and maintain positive reinforcement.`;
}
