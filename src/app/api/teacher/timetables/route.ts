import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");

    // Fetch timetable entries for this teacher
    let query = admin
      .from("timetable")
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        room,
        topic,
        class_id,
        subject_id,
        classes:class_id(id, name, grade_level),
        subjects:subject_id(id, name, code)
      `)
      .eq("teacher_id", session.userId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (classId) {
      query = query.eq("class_id", classId);
    }

    const { data: timetableEntries, error: ttErr } = await query;

    if (ttErr) {
      console.error("[teacher/timetables GET] timetable error:", ttErr.message);
      return NextResponse.json({ error: "Failed to fetch timetable" }, { status: 500 });
    }

    // Also fetch classes this teacher is class teacher for (they might not have timetable entries yet)
    const { data: ctClasses } = await admin
      .from("classes")
      .select("id, name, grade_level")
      .eq("class_teacher_id", session.userId);

    // Fetch class subjects for subject teachers
    const { data: csEntries } = await admin
      .from("class_subjects")
      .select("class_id, subject_id, subjects(id, name, code), classes:class_id(id, name, grade_level)")
      .eq("teacher_id", session.userId);

    return NextResponse.json({
      timetable: timetableEntries || [],
      classes: ctClasses || [],
      class_subjects: csEntries || [],
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[teacher/timetables GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
