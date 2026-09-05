import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");

    if (!classId) {
      return NextResponse.json({ error: "class_id is required" }, { status: 400 });
    }

    // Verify teacher has access to this class
    const [{ data: ctClass }, { data: csSubjects }] = await Promise.all([
      admin.from("classes").select("id, name, grade_level, class_teacher_id").eq("id", classId).eq("class_teacher_id", session.userId).maybeSingle(),
      admin.from("class_subjects").select("id").eq("class_id", classId).eq("teacher_id", session.userId).limit(1),
    ]);

    if (!ctClass && (!csSubjects || csSubjects.length === 0) && session.userCategory !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get class info
    const { data: classInfo } = await admin
      .from("classes")
      .select("id, name, grade_level, class_teacher_id, profiles:class_teacher_id(full_name)")
      .eq("id", classId)
      .maybeSingle();

    // Get all students in class
    const { data: students } = await admin
      .from("students")
      .select("id, admission_number, status, profiles:id(full_name, avatar_url)")
      .eq("class_id", classId)
      .eq("status", "active")
      .order("admission_number");

    const studentIds = students?.map((s) => s.id) || [];

    if (studentIds.length === 0) {
      return NextResponse.json({
        class: classInfo,
        total_students: 0,
        stats: { avg_grade: 0, attendance_rate: 0, assignment_completion: 0 },
        at_risk: [],
        subject_performance: [],
      });
    }

    // Get recent grades (current term)
    const currentYear = new Date().getFullYear();
    const { data: grades } = await admin
      .from("assessments")
      .select("student_id, score, max_score, performance_level, subject_id, subjects:subject_id(name)")
      .in("student_id", studentIds)
      .eq("academic_year", String(currentYear))
      .order("created_at", { ascending: false });

    // Get recent attendance (last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const { data: attendance } = await admin
      .from("attendance")
      .select("student_id, status")
      .in("student_id", studentIds)
      .gte("date", fourteenDaysAgo.toISOString().split("T")[0]);

    // Get assignment submissions
    const { data: submissions } = await admin
      .from("assignment_submissions")
      .select("student_id, status, grade")
      .in("student_id", studentIds);

    // Calculate per-student stats for at-risk detection
    const studentStats = new Map<string, { avg: number; count: number; present: number; totalAtt: number; submitted: number; totalAssignments: number }>();

    studentIds.forEach((id) => {
      studentStats.set(id, { avg: 0, count: 0, present: 0, totalAtt: 0, submitted: 0, totalAssignments: 0 });
    });

    grades?.forEach((g) => {
      const s = studentStats.get(g.student_id);
      if (s) {
        s.avg += (g.score || 0) / (g.max_score || 100) * 100;
        s.count++;
      }
    });

    attendance?.forEach((a) => {
      const s = studentStats.get(a.student_id);
      if (s) {
        s.totalAtt++;
        if (a.status === "present") s.present++;
      }
    });

    submissions?.forEach((sub) => {
      const s = studentStats.get(sub.student_id);
      if (s) {
        s.totalAssignments++;
        if (sub.status === "submitted" || sub.status === "graded") s.submitted++;
      }
    });

    // Compute all student stats
    const allStudents = students?.map((s) => {
      const stats = studentStats.get(s.id);
      const avg = stats && stats.count > 0 ? Math.round(stats.avg / stats.count) : 0;
      const attRate = stats && stats.totalAtt > 0 ? Math.round((stats.present / stats.totalAtt) * 100) : 0;
      const assignRate = stats && stats.totalAssignments > 0 ? Math.round((stats.submitted / stats.totalAssignments) * 100) : 0;
      return {
        id: s.id,
        name: (s.profiles as unknown as { full_name: string })?.full_name || "",
        avatar_url: (s.profiles as unknown as { avatar_url: string | null })?.avatar_url || null,
        admission_number: s.admission_number || "",
        avg,
        attRate,
        assignRate,
        risk: avg < 50 || attRate < 60 ? "high" : avg < 65 || attRate < 75 ? "medium" : "low",
      };
    }) || [];

    // At-risk students (avg < 50% OR attendance < 60%)
    const atRisk = allStudents
      .filter((s) => s.risk !== "low")
      .sort((a, b) => (a.avg - b.avg) || (a.attRate - b.attRate));

    // Overall stats
    const allAvgs = Array.from(studentStats.values()).filter((s) => s.count > 0).map((s) => s.avg / s.count);
    const classAvg = allAvgs.length > 0 ? Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) : 0;

    const totalAttRecords = attendance?.length || 0;
    const presentRecords = attendance?.filter((a) => a.status === "present").length || 0;
    const classAttRate = totalAttRecords > 0 ? Math.round((presentRecords / totalAttRecords) * 100) : 0;

    const totalAssignments = submissions?.length || 0;
    const submittedAssignments = submissions?.filter((s) => s.status === "submitted" || s.status === "graded").length || 0;
    const classAssignRate = totalAssignments > 0 ? Math.round((submittedAssignments / totalAssignments) * 100) : 0;

    // Subject performance
    const subjectGroups = new Map<string, { scores: number[]; maxScores: number[]; name: string }>();
    grades?.forEach((g) => {
      const sid = g.subject_id;
      const name = (g.subjects as unknown as { name: string })?.name || sid;
      if (!subjectGroups.has(sid)) subjectGroups.set(sid, { scores: [], maxScores: [], name });
      const sg = subjectGroups.get(sid)!;
      sg.scores.push(g.score || 0);
      sg.maxScores.push(g.max_score || 100);
    });

    const subjectPerformance = Array.from(subjectGroups.entries()).map(([sid, data]) => {
      const totalScore = data.scores.reduce((a, b) => a + b, 0);
      const totalMax = data.maxScores.reduce((a, b) => a + b, 0);
      return {
        subject_id: sid,
        subject_name: data.name,
        average: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
        student_count: data.scores.length,
      };
    }).sort((a, b) => b.average - a.average);

    return NextResponse.json({
      class: classInfo,
      total_students: students?.length || 0,
      stats: {
        avg_grade: classAvg,
        attendance_rate: classAttRate,
        assignment_completion: classAssignRate,
      },
      at_risk: atRisk || [],
      students: allStudents,
      subject_performance: subjectPerformance,
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[teacher/class-dashboard GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
