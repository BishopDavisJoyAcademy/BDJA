import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    if (session.userCategory !== "staff" && session.userCategory !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: ctClasses } = await admin
      .from("classes")
      .select("id, name, grade_level")
      .eq("class_teacher_id", session.userId);

    const { data: csEntries } = await admin
      .from("class_subjects")
      .select("class_id, subject_id, subjects(id, name, code)")
      .eq("teacher_id", session.userId);

    const subjectMap = new Map();
    (csEntries || []).forEach((entry: Record<string, unknown>) => {
      const sub = entry.subjects as Record<string, string> | null;
      if (sub?.id && !subjectMap.has(sub.id)) {
        subjectMap.set(sub.id, { id: sub.id, name: sub.name, code: sub.code });
      }
    });

    let allClasses = ctClasses || [];
    let allSubjects = Array.from(subjectMap.values());

    if (session.userCategory === "admin") {
      const [{ data: classes }, { data: subjects }] = await Promise.all([
        admin.from("classes").select("id, name, grade_level"),
        admin.from("subjects").select("id, name, code"),
      ]);
      allClasses = classes || [];
      allSubjects = subjects || [];
    }

    return NextResponse.json({ classes: allClasses, subjects: allSubjects, class_subjects: csEntries || [] });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[teacher/subjects GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
