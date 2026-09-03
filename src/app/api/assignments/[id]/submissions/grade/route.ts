import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { id: assignmentId } = await params;
    const body = await req.json();
    const { student_id, score, feedback } = body;

    if (!student_id || score === undefined) {
      return NextResponse.json({ error: "student_id and score are required" }, { status: 400 });
    }

    const { data: assignment } = await admin
      .from("assignments")
      .select("id, teacher_id, class_id, max_score")
      .eq("id", assignmentId)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (session.userCategory === "staff") {
      const [{ data: ctClass }, { data: csEntry }] = await Promise.all([
        admin.from("classes").select("id").eq("id", assignment.class_id).eq("class_teacher_id", session.userId).maybeSingle(),
        admin.from("class_subjects").select("id").eq("class_id", assignment.class_id).eq("teacher_id", session.userId).maybeSingle(),
      ]);
      if (!ctClass && !csEntry && assignment.teacher_id !== session.userId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const now = new Date().toISOString();
    const gradeData = {
      grade: { score, feedback, max_score: assignment.max_score },
      graded_at: now,
      graded_by: session.userId,
      status: "graded",
    };

    const { error } = await admin
      .from("assignment_submissions")
      .update(gradeData)
      .eq("assignment_id", assignmentId)
      .eq("student_id", student_id);

    if (error) {
      console.error("[grade PUT] Error:", error.message);
      return NextResponse.json({ error: "Failed to grade" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "ASSIGNMENT_GRADED",
      table_name: "assignment_submissions",
      record_id: assignmentId,
      new_data: gradeData,
      ip_address: getClientIP(req),
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[grade PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
