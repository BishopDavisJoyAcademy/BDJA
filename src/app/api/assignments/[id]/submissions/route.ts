import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

// GET — fetch submissions for an assignment (teacher view)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { id: assignmentId } = await params;

    // Verify assignment exists and teacher has access
    const { data: assignment } = await admin
      .from("assignments")
      .select("id, teacher_id, class_id, title")
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

    // Fetch all students in the class
    const { data: students } = await admin
      .from("students")
      .select("id, admission_number, profile_id, status")
      .eq("class_id", assignment.class_id)
      .eq("status", "active");

    // Fetch submissions
    const { data: submissions } = await admin
      .from("assignment_submissions")
      .select("*")
      .eq("assignment_id", assignmentId);

    // Merge: show all students with their submission (or null)
    const studentIds = students?.map((s) => s.id) || [];
    const studentProfiles = studentIds.length > 0
      ? await admin.from("profiles").select("id, full_name, avatar_url").in("id", studentIds)
      : { data: [] };

    const profileMap = new Map((studentProfiles.data || []).map((p) => [p.id, p]));
    const submissionMap = new Map((submissions || []).map((s) => [s.student_id, s]));

    const merged = (students || []).map((s) => {
      const sub = submissionMap.get(s.id);
      const profile = profileMap.get(s.id);
      return {
        student_id: s.id,
        admission_number: s.admission_number,
        full_name: profile?.full_name || "Unknown",
        avatar_url: profile?.avatar_url || null,
        status: sub ? sub.status : "not_submitted",
        submitted_at: sub?.submitted_at || null,
        content: sub?.content || null,
        attachments: sub?.attachments || null,
        grade: sub?.grade || null,
        graded_at: sub?.graded_at || null,
        graded_by: sub?.graded_by || null,
        submission_id: sub?.id || null,
      };
    });

    return NextResponse.json({ submissions: merged, assignment });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[submissions GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — student submits assignment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { id: assignmentId } = await params;

    if (session.userCategory !== "student") {
      return NextResponse.json({ error: "Only students can submit assignments" }, { status: 403 });
    }

    // Verify student is in the assignment's class
    const { data: assignment } = await admin
      .from("assignments")
      .select("id, class_id, due_date, status")
      .eq("id", assignmentId)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (assignment.status === "closed") {
      return NextResponse.json({ error: "This assignment is closed" }, { status: 403 });
    }

    const { data: student } = await admin
      .from("students")
      .select("class_id")
      .eq("id", session.userId)
      .maybeSingle();

    if (!student || student.class_id !== assignment.class_id) {
      return NextResponse.json({ error: "You are not enrolled in this class" }, { status: 403 });
    }

    const body = await req.json();

    // Check if already submitted
    const { data: existing } = await admin
      .from("assignment_submissions")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("student_id", session.userId)
      .maybeSingle();

    const now = new Date().toISOString();
    const isLate = assignment.due_date && new Date(now) > new Date(assignment.due_date);

    const subData = {
      assignment_id: assignmentId,
      student_id: session.userId,
      content: body.content || null,
      attachments: body.attachments || null,
      status: isLate ? "submitted_late" : "submitted",
      submitted_at: now,
    };

    if (existing) {
      const { error } = await admin
        .from("assignment_submissions")
        .update(subData)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from("assignment_submissions").insert(subData);
      if (error) throw error;
    }

    // Audit log
    await logAudit({
      user_id: session.userId,
      action: "ASSIGNMENT_SUBMITTED",
      table_name: "assignment_submissions",
      record_id: assignmentId,
      new_data: subData,
      ip_address: getClientIP(req),
    }).catch(() => {});

    return NextResponse.json({ success: true, late: isLate });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[submissions POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
