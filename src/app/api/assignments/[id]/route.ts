import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

/* ─── Types ─── */
interface AssignmentRow {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string | null;
  max_score: number | null;
  attachments: unknown | null;
  rubric: unknown | null;
  created_at: string | null;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  classes: { name: string | null; grade_level: string | null } | null;
  subjects: { name: string | null; code: string | null } | null;
}

interface SubmissionRow {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  attachments: unknown | null;
  status: string | null;
  submitted_at: string | null;
  grade: unknown | null;
  graded_at: string | null;
  graded_by: string | null;
}

/* ─── GET: single assignment with access control ─── */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { id } = await params;

    const { data: rawAssignment } = await admin
      .from("assignments")
      .select(`
        id, title, description, due_date, status, max_score, attachments, rubric, created_at,
        class_id, subject_id, teacher_id,
        classes!assignments_class_id_fkey(name, grade_level),
        subjects!assignments_subject_id_fkey(name, code)
      `)
      .eq("id", id)
      .maybeSingle();

    if (!rawAssignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const assignment = rawAssignment as unknown as AssignmentRow;

    // Access control
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

    // Fetch student's own submission if applicable
    let mySubmission: SubmissionRow | null = null;
    if (session.userCategory === "student") {
      const { data: sub } = await admin
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", id)
        .eq("student_id", session.userId)
        .maybeSingle();
      mySubmission = sub as unknown as SubmissionRow | null;
    }

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        due_date: assignment.due_date,
        status: assignment.status,
        max_score: assignment.max_score,
        attachments: assignment.attachments,
        rubric: assignment.rubric,
        created_at: assignment.created_at,
        class_id: assignment.class_id,
        subject_id: assignment.subject_id,
        teacher_id: assignment.teacher_id,
        class_name: assignment.classes?.name || null,
        grade_level: assignment.classes?.grade_level || null,
        subject_name: assignment.subjects?.name || null,
        subject_code: assignment.subjects?.code || null,
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
