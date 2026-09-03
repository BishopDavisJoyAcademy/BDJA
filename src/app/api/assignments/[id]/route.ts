import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { id } = await params;

    const { data: assignment } = await admin
      .from("assignments")
      .select(`
        id, title, description, due_date, status, max_score, attachments, rubric, created_at,
        class_id, subject_id, teacher_id,
        classes!assignments_class_id_fkey(name, grade_level),
        subjects!assignments_subject_id_fkey(name, code)
      `)
      .eq("id", id)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (session.userCategory === "student") {
      const { data: student } = await admin
        .from("students")
        .select("class_id")
        .eq("id", session.userId)
        .maybeSingle();
      if (student?.class_id !== assignment.class_id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } else if (session.userCategory === "staff") {
      const [{ data: ctClass }, { data: csEntry }] = await Promise.all([
        admin.from("classes").select("id").eq("id", assignment.class_id).eq("class_teacher_id", session.userId).maybeSingle(),
        admin.from("class_subjects").select("id").eq("class_id", assignment.class_id).eq("teacher_id", session.userId).maybeSingle(),
      ]);
      if (!ctClass && !csEntry && assignment.teacher_id !== session.userId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    let mySubmission = null;
    if (session.userCategory === "student") {
      const { data: sub } = await admin
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", id)
        .eq("student_id", session.userId)
        .maybeSingle();
      mySubmission = sub;
    }

    return NextResponse.json({
      assignment: {
        ...assignment,
        class_name: (assignment.classes as Record<string, string> | null)?.name || null,
        grade_level: (assignment.classes as Record<string, string> | null)?.grade_level || null,
        subject_name: (assignment.subjects as Record<string, string> | null)?.name || null,
        subject_code: (assignment.subjects as Record<string, string> | null)?.code || null,
      },
      mySubmission,
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[assignment GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
