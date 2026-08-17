import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    // Get teacher's timetable entries to find class_ids, then get subjects for those classes
    const { data: timetableData, error: ttError } = await admin
      .from("teacher_timetables")
      .select("class_id, subject_id")
      .eq("teacher_id", session.userId);

    if (ttError) {
      return NextResponse.json({ error: "Failed to fetch timetable" }, { status: 500 });
    }

    const subjectIds = [...new Set((timetableData || []).map((t) => t.subject_id).filter(Boolean))];

    if (subjectIds.length === 0) {
      return NextResponse.json({ subjects: [] });
    }

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
