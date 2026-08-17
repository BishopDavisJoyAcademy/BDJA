import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    // Get teacher's timetable entries to find class_ids
    const { data: timetableData, error: ttError } = await admin
      .from("teacher_timetables")
      .select("class_id")
      .eq("teacher_id", session.userId);

    if (ttError) {
      return NextResponse.json({ error: "Failed to fetch timetable" }, { status: 500 });
    }

    const classIds = (timetableData || [])
      .map((t) => t.class_id)
      .filter((id): id is string => Boolean(id));
    const uniqueClassIds = Array.from(new Set(classIds));

    if (uniqueClassIds.length === 0) {
      return NextResponse.json({ subjects: [] });
    }

    // Get subject_ids from class_subjects
    const { data: classSubjects, error: csError } = await admin
      .from("class_subjects")
      .select("subject_id")
      .in("class_id", uniqueClassIds);

    if (csError) {
      return NextResponse.json({ error: "Failed to fetch class subjects" }, { status: 500 });
    }

    const subjectIds = Array.from(
      new Set((classSubjects || []).map((cs) => cs.subject_id).filter((id): id is string => Boolean(id)))
    );

    if (subjectIds.length === 0) {
      return NextResponse.json({ subjects: [] });
    }

    // Get actual subjects
    const { data: subjects, error: subjError } = await admin
      .from("subjects")
      .select("*")
      .in("id", subjectIds);

    if (subjError) {
      return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
    }

    return NextResponse.json({ subjects: subjects || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
