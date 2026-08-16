import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    // Get classes where this teacher is the class teacher OR teaches a subject in the class
    const { data: classTeacherClasses, error: ctError } = await admin
      .from("classes")
      .select("id, name, grade_level, stream, academic_year, campus_id")
      .eq("class_teacher_id", session.userId);

    if (ctError) {
      console.error("[teacher/classes GET] class_teacher error:", ctError);
    }

    const { data: subjectTeacherClasses, error: stError } = await admin
      .from("class_subjects")
      .select("classes(id, name, grade_level, stream, academic_year, campus_id)")
      .eq("teacher_id", session.userId);

    if (stError) {
      console.error("[teacher/classes GET] subject_teacher error:", stError);
    }

    // Merge and deduplicate
    const classMap = new Map<string, { id: string; name: string; grade_level: string; stream: string | null; academic_year: string; campus_id: string }>();

    (classTeacherClasses || []).forEach((c) => {
      classMap.set(c.id, c);
    });

    (subjectTeacherClasses || []).forEach((item) => {
      const c = (item as Record<string, unknown>).classes;
      if (c && !classMap.has(c.id)) {
        classMap.set(c.id, c);
      }
    });

    const classes = Array.from(classMap.values());
    return NextResponse.json({ classes });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: (error instanceof Error && "statusCode" in error ? (error as Error & { statusCode?: number }).statusCode : undefined) || 401 });
    }
    console.error("[teacher/classes GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
