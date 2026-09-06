import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { chatWithJoy } from "@/lib/aevibron";

export const dynamic = "force-dynamic";

interface GenerateReportBody {
  student_id: string;
  academic_year: string;
  term: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const hasPerm = await hasPermission(session.userId, "grades.manage");
    if (!hasPerm) {
      return NextResponse.json({ error: "grades.manage permission required" }, { status: 403 });
    }

    const body = (await req.json()) as GenerateReportBody;
    const { student_id, academic_year, term } = body;

    if (!student_id || !academic_year || !term) {
      return NextResponse.json({ error: "student_id, academic_year, and term are required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Fetch student profile and class
    const { data: studentProfile } = await admin
      .from("students")
      .select("*, profiles(full_name, email, phone), classes(id, name, grade_level, stream, class_teacher_id)")
      .eq("profile_id", student_id)
      .single();

    if (!studentProfile) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const studentName = studentProfile.profiles?.full_name || "Unknown";
    const className = studentProfile.classes?.name || "Unknown";
    const classId = studentProfile.classes?.id;

    // Fetch all grades for this student in this term/year
    const { data: assessments } = await admin
      .from("assessments")
      .select("*, subjects(id, name, code), classes(name)")
      .eq("student_id", student_id)
      .eq("academic_year", academic_year)
      .eq("term", term)
      .order("created_at", { ascending: false });

    // Fetch attendance for this student
    const { data: attendanceRecords } = await admin
      .from("attendance")
      .select("date, status, notes")
      .eq("student_id", student_id)
      .gte("date", `${academic_year}-01-01`)
      .lte("date", `${academic_year}-12-31`)
      .order("date", { ascending: true });

    const presentCount = attendanceRecords?.filter((a) => a.status === "present").length || 0;
    const absentCount = attendanceRecords?.filter((a) => a.status === "absent").length || 0;
    const lateCount = attendanceRecords?.filter((a) => a.status === "late").length || 0;
    const totalAttendance = attendanceRecords?.length || 0;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 1000) / 10 : 0;

    // Build subject performance summary
    const subjectMap: Record<string, { name: string; scores: number[]; maxScores: number[]; levels: string[] }> = {};
    for (const a of assessments || []) {
      const subjId = a.subject_id;
      const subjName = a.subjects?.name || "Unknown";
      if (!subjId) continue;
      if (!subjectMap[subjId]) subjectMap[subjId] = { name: subjName, scores: [], maxScores: [], levels: [] };
      if (a.score !== null && a.max_score !== null) {
        subjectMap[subjId].scores.push(a.score);
        subjectMap[subjId].maxScores.push(a.max_score);
        subjectMap[subjId].levels.push(a.performance_level || "unknown");
      }
    }

    const subjectSummaries = Object.entries(subjectMap).map(([subjectId, data]) => {
      const percentages = data.scores.map((s, i) => (s / data.maxScores[i]) * 100);
      const avg = percentages.reduce((a, b) => a + b, 0) / percentages.length;
      const levelCounts: Record<string, number> = {};
      for (const l of data.levels) levelCounts[l] = (levelCounts[l] || 0) + 1;
      return {
        subjectId,
        subjectName: data.name,
        averagePercentage: Math.round(avg * 10) / 10,
        assessmentCount: data.scores.length,
        performanceDistribution: levelCounts,
      };
    });

    // Build AI prompt
    const aiPrompt = `Generate a comprehensive narrative report card for the following student. Write in a warm, professional tone suitable for parents. Include specific observations, strengths, and actionable improvement recommendations.

STUDENT: ${studentName}
CLASS: ${className}
ACADEMIC YEAR: ${academic_year}
TERM: ${term}

ATTENDANCE SUMMARY:
- Total days recorded: ${totalAttendance}
- Present: ${presentCount} (${attendanceRate}%)
- Absent: ${absentCount}
- Late: ${lateCount}

SUBJECT PERFORMANCE:
${subjectSummaries.map((s) => `- ${s.subjectName}: Average ${s.averagePercentage}% (${s.assessmentCount} assessments)`).join("\n")}

Please generate:
1. An overall opening paragraph about the student's general performance and attitude
2. Per-subject narrative comments (2-3 sentences each) highlighting strengths and areas for growth
3. A closing paragraph with encouragement and specific recommendations for parents
4. A brief attendance comment

Format as a structured JSON with these keys: openingParagraph, subjectComments (array of {subjectName, comment, strengths, improvementAreas}), attendanceComment, closingParagraph, overallRecommendation`;

    // Call AI
    const aiResponse = await chatWithJoy(
      [
        { role: "system", content: "You are an expert Kenyan primary school teacher writing narrative report cards. Be warm, specific, and constructive." },
        { role: "user", content: aiPrompt },
      ],
      { userName: session.fullName || "Teacher", userCategory: "teacher", personality: "professional" }
    );

    // Parse AI response (handle JSON or plain text)
    let parsedNarrative: Record<string, unknown> = {};
    let narrativeText = aiResponse;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedNarrative = JSON.parse(jsonMatch[0]);
        narrativeText = JSON.stringify(parsedNarrative, null, 2);
      }
    } catch {
      // Keep raw text if JSON parse fails
    }

    // Upsert report card
    const { data: existingReport } = await admin
      .from("report_cards")
      .select("id")
      .eq("student_id", student_id)
      .eq("academic_year", academic_year)
      .eq("term", term)
      .single();

    const reportData = {
      student_id,
      academic_year,
      term,
      class_id: classId,
      generated_by: session.userId,
      generated_at: new Date().toISOString(),
      ai_narrative: narrativeText,
      ai_generated_at: new Date().toISOString(),
      ai_model_used: "aevibron-core-v3",
      status: "draft",
      teacher_remarks: null,
    };

    let reportId: string;
    if (existingReport) {
      const { data: updated } = await admin
        .from("report_cards")
        .update(reportData)
        .eq("id", existingReport.id)
        .select("id")
        .single();
      reportId = updated?.id || existingReport.id;
    } else {
      const { data: inserted } = await admin
        .from("report_cards")
        .insert(reportData)
        .select("id")
        .single();
      reportId = inserted?.id ?? "";
      if (!reportId) throw new Error("Failed to create report card");
    }

    // Insert per-subject entries
    const subjectEntries = subjectSummaries.map((s) => ({
      report_card_id: reportId,
      subject_id: s.subjectId,
      narrative_comment: (parsedNarrative.subjectComments as Array<{ subjectName: string; comment: string }> || [])
        .find((c) => c.subjectName === s.subjectName)?.comment || `Average performance in ${s.subjectName} at ${s.averagePercentage}%.`,
      strengths: (parsedNarrative.subjectComments as Array<{ subjectName: string; strengths: string }> || [])
        .find((c) => c.subjectName === s.subjectName)?.strengths || "",
      improvement_areas: (parsedNarrative.subjectComments as Array<{ subjectName: string; improvementAreas: string }> || [])
        .find((c) => c.subjectName === s.subjectName)?.improvementAreas || "",
      grade_average: s.averagePercentage,
      attendance_rate: attendanceRate,
      ai_generated: true,
      ai_confidence: 0.85,
    }));

    if (subjectEntries.length > 0) {
      await admin.from("report_card_subject_entries").upsert(subjectEntries, { onConflict: "report_card_id,subject_id" });
    }

    return NextResponse.json({
      success: true,
      reportId,
      narrative: narrativeText,
      subjectSummaries,
      attendanceRate,
    });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/reports/generate] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
