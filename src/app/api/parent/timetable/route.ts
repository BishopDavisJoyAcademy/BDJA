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
      return NextResponse.json({ timetable: [] });
    }

    const { data, error } = await admin
      .from("timetable")
      .select(`
        *,
        subjects:subject_id(name, code),
        profiles:teacher_id(full_name)
      `)
      .eq("class_id", classId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("[api/parent/timetable] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch timetable" }, { status: 500 });
    }

    return NextResponse.json({ timetable: data || [] });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[api/parent/timetable] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
