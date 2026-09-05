"use server";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface GradeAnalytics {
  atRiskStudents: Array<{
    studentId: string;
    studentName: string;
    className: string;
    currentAverage: number;
    previousAverage: number;
    trend: "improving" | "declining" | "stable";
    riskScore: number;
    weakSubjects: string[];
    recommendation: string;
  }>;
  classAverages: Array<{
    classId: string;
    className: string;
    averageScore: number;
    studentCount: number;
    topSubject: string;
    weakestSubject: string;
  }>;
  subjectPerformance: Array<{
    subjectId: string;
    subjectName: string;
    averageScore: number;
    studentCount: number;
    performanceDistribution: Record<string, number>;
  }>;
  overallStats: {
    totalAssessments: number;
    averageScore: number;
    passRate: number;
    atRiskCount: number;
  };
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
    const term = searchParams.get("term");
    const academicYear = searchParams.get("academic_year");

    // Build base query for assessments
    let assessmentQuery = admin
      .from("assessments")
      .select("*, subjects(name), students(profile_id, class_id, status), classes(name, grade_level)");

    if (classId) assessmentQuery = assessmentQuery.eq("class_id", classId);
    if (term) assessmentQuery = assessmentQuery.eq("term", term);
    if (academicYear) assessmentQuery = assessmentQuery.eq("academic_year", academicYear);

    const { data: assessments, error: assessmentsError } = await assessmentQuery;
    if (assessmentsError) throw assessmentsError;

    if (!assessments || assessments.length === 0) {
      return NextResponse.json({
        atRiskStudents: [],
        classAverages: [],
        subjectPerformance: [],
        overallStats: { totalAssessments: 0, averageScore: 0, passRate: 0, atRiskCount: 0 },
      } as GradeAnalytics);
    }

    // Get all student profiles for names
    const studentIds = [...new Set(assessments.map((a) => a.student_id).filter(Boolean))];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

    // Compute per-student analytics
    const studentScores: Record<string, Array<{
      score: number;
      maxScore: number;
      percentage: number;
      subjectName: string;
      performanceLevel: string;
      date: string;
    }>> = {};

    for (const a of assessments) {
      if (!a.student_id || a.score === null || a.max_score === null) continue;
      const pct = (a.score / a.max_score) * 100;
      if (!studentScores[a.student_id]) studentScores[a.student_id] = [];
      studentScores[a.student_id].push({
        score: a.score,
        maxScore: a.max_score,
        percentage: pct,
        subjectName: a.subjects?.name || "Unknown",
        performanceLevel: a.performance_level,
        date: a.created_at,
      });
    }

    // Identify at-risk students
    const atRiskStudents: GradeAnalytics["atRiskStudents"] = [];
    for (const [studentId, scores] of Object.entries(studentScores)) {
      if (scores.length < 2) continue;

      // Sort by date
      scores.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const recent = scores.slice(-Math.ceil(scores.length / 2));
      const older = scores.slice(0, Math.floor(scores.length / 2));

      const recentAvg = recent.reduce((s, r) => s + r.percentage, 0) / recent.length;
      const olderAvg = older.reduce((s, o) => s + o.percentage, 0) / older.length;

      const trend: "improving" | "declining" | "stable" =
        recentAvg > olderAvg + 5 ? "improving" :
        recentAvg < olderAvg - 5 ? "declining" : "stable";

      // Risk score: 0-100, higher = more at risk
      let riskScore = 0;
      if (trend === "declining") riskScore += 40;
      if (recentAvg < 50) riskScore += 30;
      else if (recentAvg < 70) riskScore += 15;

      const weakSubjects = [...new Set(
        scores.filter((s) => s.percentage < 60).map((s) => s.subjectName)
      )];
      if (weakSubjects.length > 0) riskScore += 10 * weakSubjects.length;

      if (riskScore >= 30) {
        const assessment = assessments.find((a) => a.student_id === studentId);
        atRiskStudents.push({
          studentId,
          studentName: profileMap.get(studentId) || "Unknown Student",
          className: assessment?.classes?.name || "Unknown",
          currentAverage: Math.round(recentAvg * 10) / 10,
          previousAverage: Math.round(olderAvg * 10) / 10,
          trend,
          riskScore: Math.min(riskScore, 100),
          weakSubjects: weakSubjects.slice(0, 5),
          recommendation: generateRecommendation(trend, recentAvg, weakSubjects),
        });
      }
    }

    // Sort by risk score descending
    atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);

    // Compute class averages
    const classGroups: Record<string, { name: string; scores: number[]; subjectScores: Record<string, number[]> }> = {};
    for (const a of assessments) {
      if (!a.class_id || a.score === null || a.max_score === null) continue;
      const pct = (a.score / a.max_score) * 100;
      if (!classGroups[a.class_id]) {
        classGroups[a.class_id] = { name: a.classes?.name || "Unknown", scores: [], subjectScores: {} };
      }
      classGroups[a.class_id].scores.push(pct);
      const subj = a.subjects?.name || "Unknown";
      if (!classGroups[a.class_id].subjectScores[subj]) classGroups[a.class_id].subjectScores[subj] = [];
      classGroups[a.class_id].subjectScores[subj].push(pct);
    }

    const classAverages: GradeAnalytics["classAverages"] = Object.entries(classGroups).map(([classId, data]) => {
      const avg = data.scores.reduce((s, v) => s + v, 0) / data.scores.length;
      const subjectAvgs = Object.entries(data.subjectScores).map(([name, scores]) => ({
        name,
        avg: scores.reduce((s, v) => s + v, 0) / scores.length,
      }));
      subjectAvgs.sort((a, b) => b.avg - a.avg);
      return {
        classId,
        className: data.name,
        averageScore: Math.round(avg * 10) / 10,
        studentCount: data.scores.length,
        topSubject: subjectAvgs[0]?.name || "N/A",
        weakestSubject: subjectAvgs[subjectAvgs.length - 1]?.name || "N/A",
      };
    });

    // Compute subject performance
    const subjectGroups: Record<string, { name: string; scores: number[]; levels: Record<string, number> }> = {};
    for (const a of assessments) {
      if (!a.subject_id || a.score === null || a.max_score === null) continue;
      const pct = (a.score / a.max_score) * 100;
      const subjName = a.subjects?.name || "Unknown";
      if (!subjectGroups[a.subject_id]) {
        subjectGroups[a.subject_id] = { name: subjName, scores: [], levels: {} };
      }
      subjectGroups[a.subject_id].scores.push(pct);
      const level = a.performance_level || "unknown";
      subjectGroups[a.subject_id].levels[level] = (subjectGroups[a.subject_id].levels[level] || 0) + 1;
    }

    const subjectPerformance: GradeAnalytics["subjectPerformance"] = Object.entries(subjectGroups).map(([subjectId, data]) => ({
      subjectId,
      subjectName: data.name,
      averageScore: Math.round((data.scores.reduce((s, v) => s + v, 0) / data.scores.length) * 10) / 10,
      studentCount: data.scores.length,
      performanceDistribution: data.levels,
    }));

    // Overall stats
    const allScores = assessments.filter((a) => a.score !== null && a.max_score !== null).map((a) => (a.score! / a.max_score!) * 100);
    const overallStats = {
      totalAssessments: assessments.length,
      averageScore: allScores.length > 0 ? Math.round((allScores.reduce((s, v) => s + v, 0) / allScores.length) * 10) / 10 : 0,
      passRate: allScores.length > 0 ? Math.round((allScores.filter((s) => s >= 50).length / allScores.length) * 100) : 0,
      atRiskCount: atRiskStudents.length,
    };

    return NextResponse.json({
      atRiskStudents: atRiskStudents.slice(0, 20),
      classAverages,
      subjectPerformance,
      overallStats,
    } as GradeAnalytics);
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/analytics/grades] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to analyze grades" }, { status: 500 });
  }
}

function generateRecommendation(
  trend: "improving" | "declining" | "stable",
  recentAvg: number,
  weakSubjects: string[]
): string {
  if (trend === "declining" && recentAvg < 50) {
    return `Urgent intervention needed. Student is failing with declining performance. Recommend: parent meeting, extra tutoring in ${weakSubjects.join(", ") || "all subjects"}, and academic counseling.`;
  }
  if (trend === "declining") {
    return `Performance is declining. Recommend: review study habits, extra practice in ${weakSubjects.join(", ") || "weak areas"}, and teacher check-in.`;
  }
  if (recentAvg < 60) {
    return `Student is struggling. Recommend: targeted support in ${weakSubjects.join(", ") || "key subjects"} and regular progress monitoring.`;
  }
  if (weakSubjects.length > 0) {
    return `Overall stable but needs support in ${weakSubjects.join(", ")}. Recommend focused practice.`;
  }
  return `Continue current approach. Monitor for any changes.`;
}
