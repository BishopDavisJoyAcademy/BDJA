import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { chatWithJoy } from "@/lib/aevibron";

export const dynamic = "force-dynamic";

interface DraftBody {
  recipient_parent_id?: string;
  recipient_student_id?: string;
  subject: string;
  context: string;
  tone: "formal" | "professional" | "casual" | "urgent" | "encouraging";
  language: "english" | "kiswahili" | "both";
  include_grade_summary?: boolean;
  include_attendance_summary?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const hasPerm = await hasPermission(session.userId, "messages.send");
    if (!hasPerm) {
      return NextResponse.json({ error: "messages.send permission required" }, { status: 403 });
    }

    const body = (await req.json()) as DraftBody;
    const { recipient_parent_id, recipient_student_id, subject, context, tone, language, include_grade_summary, include_attendance_summary } = body;

    if (!subject || !context) {
      return NextResponse.json({ error: "subject and context are required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    let parentName = "Parent/Guardian";
    let studentName = "your child";
    let gradeSummary = "";
    let attendanceSummary = "";

    // Fetch parent info
    if (recipient_parent_id) {
      const { data: parent } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", recipient_parent_id)
        .single();
      if (parent?.full_name) parentName = parent.full_name;
    }

    // Fetch student info
    if (recipient_student_id) {
      const { data: student } = await admin
        .from("students")
        .select("*, profiles(full_name)")
        .eq("id", recipient_student_id)
        .single();
      if (student?.profiles?.full_name) studentName = student.profiles.full_name;

      // Fetch grade summary if requested
      if (include_grade_summary) {
        const { data: assessments } = await admin
          .from("assessments")
          .select("*, subjects(name)")
          .eq("student_id", recipient_student_id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (assessments && assessments.length > 0) {
          const subjectAvgs: Record<string, { name: string; scores: number[]; maxScores: number[] }> = {};
          for (const a of assessments) {
            if (a.score === null || a.max_score === null) continue;
            const sid = a.subjects?.name || "Unknown";
            if (!subjectAvgs[sid]) subjectAvgs[sid] = { name: sid, scores: [], maxScores: [] };
            subjectAvgs[sid].scores.push(a.score);
            subjectAvgs[sid].maxScores.push(a.max_score);
          }
          gradeSummary = Object.entries(subjectAvgs)
            .map(([name, data]) => {
              const avg = data.scores.reduce((s, v, i) => s + (v / data.maxScores[i]) * 100, 0) / data.scores.length;
              return `${name}: ${Math.round(avg)}%`;
            })
            .join("; ");
        }
      }

      // Fetch attendance summary if requested
      if (include_attendance_summary) {
        const { data: attRecords } = await admin
          .from("attendance")
          .select("status")
          .eq("student_id", recipient_student_id)
          .limit(30);

        if (attRecords && attRecords.length > 0) {
          const present = attRecords.filter((a) => a.status === "present").length;
          const rate = Math.round((present / attRecords.length) * 100);
          attendanceSummary = `${rate}% attendance (${present}/${attRecords.length} days present)`;
        }
      }
    }

    const aiPrompt = `Draft a ${tone} message from a teacher at Bishop Davis Joy Academy to ${parentName} about ${studentName}.

SUBJECT: ${subject}
CONTEXT: ${context}
${gradeSummary ? `GRADE SUMMARY: ${gradeSummary}` : ""}
${attendanceSummary ? `ATTENDANCE: ${attendanceSummary}` : ""}

Requirements:
- Tone: ${tone}
- Language: ${language === "both" ? "Write in English with a Kiswahili summary at the end" : language}
- Keep it warm, professional, and specific
- Include a clear call to action or next step
- Sign off as from BDJA

Generate the full message body only.`;

    const aiResponse = await chatWithJoy(
      [
        { role: "system", content: "You are a caring teacher at Bishop Davis Joy Academy drafting parent communications. Be warm, clear, and culturally appropriate for Kenyan families." },
        { role: "user", content: aiPrompt },
      ],
      { userName: session.fullName || "Teacher", userCategory: "teacher", personality: "professional", language: language === "kiswahili" ? "kiswahili" : "auto" }
    );

    // Store draft
    const { data: draft } = await admin
      .from("parent_communication_drafts")
      .insert({
        sender_id: session.userId,
        recipient_parent_id: recipient_parent_id || null,
        recipient_student_id: recipient_student_id || null,
        subject,
        body: aiResponse,
        tone,
        language,
        ai_drafted: true,
        ai_model_used: "aevibron-core-v3",
        status: "draft",
      })
      .select("id")
      .single();

    return NextResponse.json({
      success: true,
      draftId: draft?.id,
      body: aiResponse,
      tone,
      language,
    });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/communication/draft] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to draft communication" }, { status: 500 });
  }
}
