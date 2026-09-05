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
      .select("id, relationship")
      .eq("parent_id", session.userId)
      .eq("student_id", childId)
      .limit(1);

    let authorized = (authCheck && authCheck.length > 0);
    let relationship = authCheck?.[0]?.relationship || null;

    if (!authorized) {
      const { data: legacyCheck } = await admin
        .from("parent_students")
        .select("id, relationship")
        .eq("parent_id", session.userId)
        .eq("student_id", childId)
        .limit(1);
      authorized = (legacyCheck && legacyCheck.length > 0);
      relationship = legacyCheck?.[0]?.relationship || relationship;
    }

    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: student, error } = await admin
      .from("students")
      .select(`
        *,
        profiles:profile_id(full_name, email, phone, avatar_url),
        classes!inner(name, grade_level, stream, class_teacher_id, academic_year),
        campuses:campus_id(name)
      `)
      .eq("id", childId)
      .maybeSingle();

    if (error) {
      console.error("[api/parent/child-profile] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch child profile" }, { status: 500 });
    }

    if (!student) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    // Get class teacher name
    let classTeacherName = null;
    if (student.classes?.class_teacher_id) {
      const { data: teacher } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", student.classes.class_teacher_id)
        .maybeSingle();
      classTeacherName = teacher?.full_name || null;
    }

    return NextResponse.json({
      child: {
        ...student,
        class_teacher_name: classTeacherName,
        relationship,
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[api/parent/child-profile] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
