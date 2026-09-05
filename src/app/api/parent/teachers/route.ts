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
      return NextResponse.json({ teachers: [] });
    }

    // Get class teacher
    const { data: classData } = await admin
      .from("classes")
      .select("class_teacher_id")
      .eq("id", classId)
      .maybeSingle();

    // Get subject teachers via class_subjects
    const { data: classSubjects } = await admin
      .from("class_subjects")
      .select("teacher_id, subjects:subject_id(name)")
      .eq("class_id", classId);

    const teacherIds = new Set<string>();
    if (classData?.class_teacher_id) teacherIds.add(classData.class_teacher_id);
    (classSubjects || []).forEach((cs: Record<string, unknown>) => {
      if (cs.teacher_id) teacherIds.add(cs.teacher_id as string);
    });

    if (teacherIds.size === 0) {
      return NextResponse.json({ teachers: [] });
    }

    const { data: teachers, error } = await admin
      .from("profiles")
      .select("id, full_name, email, avatar_url, phone")
      .in("id", Array.from(teacherIds));

    if (error) {
      console.error("[api/parent/teachers] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
    }

    // Enrich with subject info
    const subjectMap = new Map<string, string[]>();
    (classSubjects || []).forEach((cs: Record<string, unknown>) => {
      if (cs.teacher_id) {
        const existing = subjectMap.get(cs.teacher_id as string) || [];
        existing.push((cs.subjects as Record<string, unknown>)?.name as string || "Subject");
        subjectMap.set(cs.teacher_id as string, existing);
      }
    });

    const enriched = (teachers || []).map((t: Record<string, unknown>) => ({
      ...t,
      subjects: subjectMap.get(t.id as string) || [],
      is_class_teacher: t.id === classData?.class_teacher_id,
    }));

    return NextResponse.json({ teachers: enriched });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[api/parent/teachers] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
