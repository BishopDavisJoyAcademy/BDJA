import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    // 1. Classes where this teacher is the class teacher
    const { data: classTeacherClasses, error: ctErr } = await admin
      .from("classes")
      .select("id, name, grade_level")
      .eq("class_teacher_id", session.userId);

    if (ctErr) {
      console.error("[teacher/classes GET] class teacher query error:", ctErr.message);
    }

    // 2. Classes where this teacher teaches a subject (via class_subjects)
    const { data: subjectTeacherEntries, error: stErr } = await admin
      .from("class_subjects")
      .select("class_id")
      .eq("teacher_id", session.userId);

    if (stErr) {
      console.error("[teacher/classes GET] subject teacher query error:", stErr.message);
    }

    // 3. Deduplicate class IDs
    const classIds = new Set<string>();
    (classTeacherClasses || []).forEach((c) => classIds.add(c.id));
    (subjectTeacherEntries || []).forEach((e) => classIds.add(e.class_id));

    if (classIds.size === 0) {
      return NextResponse.json({ classes: [] });
    }

    // 4. Fetch full class details for all unique IDs
    const { data: classes, error: classesErr } = await admin
      .from("classes")
      .select("id, name, grade_level")
      .in("id", Array.from(classIds));

    if (classesErr) {
      console.error("[teacher/classes GET] classes fetch error:", classesErr.message);
      return NextResponse.json(
        { error: "Failed to fetch classes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ classes: classes || [] });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[teacher/classes GET] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
