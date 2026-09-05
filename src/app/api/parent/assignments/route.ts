import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("child_id");

    if (!childId) {
      return NextResponse.json({ error: "child_id is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Verify parent access
    const { data: authCheck } = await admin
      .from("parent_children")
      .select("id")
      .eq("parent_id", session.userId)
      .eq("student_id", childId)
      .limit(1);

    let authorized = (authCheck && authCheck.length > 0);
    if (!authorized) {
      const { data: legacyCheck } = await admin
        .from("parent_students")
        .select("id")
        .eq("parent_id", session.userId)
        .eq("student_id", childId)
        .limit(1);
      authorized = (legacyCheck && legacyCheck.length > 0);
    }

    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get student's class
    const { data: studentRow } = await admin
      .from("students")
      .select("class_id")
      .eq("id", childId)
      .maybeSingle();

    const classId = studentRow?.class_id;
    if (!classId) {
      return NextResponse.json({ assignments: [] });
    }

    // Get assignments for class
    const { data: assignments, error } = await admin
      .from("assignments")
      .select(`
        *,
        subjects:subject_id(name, code),
        profiles:teacher_id(full_name)
      `)
      .eq("class_id", classId)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("[api/parent/assignments] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
    }

    // Get submission status for this student
    const assignmentIds = (assignments || []).map((a: Record<string, unknown>) => a.id);
    let submissionsMap = new Map<string, Record<string, unknown>>();
    if (assignmentIds.length > 0) {
      const { data: submissions } = await admin
        .from("assignment_submissions")
        .select("assignment_id, status, submitted_at, grade")
        .eq("student_id", childId)
        .in("assignment_id", assignmentIds as string[]);
      (submissions || []).forEach((s: Record<string, unknown>) => {
        submissionsMap.set(s.assignment_id as string, s);
      });
    }

    const enriched = (assignments || []).map((a: Record<string, unknown>) => {
      const sub = submissionsMap.get(a.id as string);
      const dueDate = a.due_date ? new Date(a.due_date as string) : null;
      const now = new Date();
      const isOverdue = dueDate && dueDate < now && (!sub || sub.status !== "submitted");

      return {
        ...a,
        submission_status: sub?.status || "pending",
        submitted_at: sub?.submitted_at || null,
        grade: sub?.grade || null,
        is_overdue: isOverdue,
      };
    });

    return NextResponse.json({ assignments: enriched });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[api/parent/assignments] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
