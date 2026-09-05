import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");

    const canManage = session.permissions.includes("timetables.manage") || session.userCategory === "admin";

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
        teacher_id,
        classes:class_id(id, name, grade_level),
        subjects:subject_id(id, name, code)
      `)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (!canManage) {
      // Teachers only see their own entries
      query = query.eq("teacher_id", session.userId);
    }

    if (classId) {
      query = query.eq("class_id", classId);
    }

    const { data: timetableEntries, error: ttErr } = await query;

    if (ttErr) {
      console.error("[teacher/timetables GET] timetable error:", ttErr.message);
      return NextResponse.json({ error: "Failed to fetch timetable" }, { status: 500 });
    }

    // Fetch classes this teacher is class teacher for
    let ctClasses: Array<{ id: string; name: string; grade_level: string }> = [];
    try {
      const { data: c } = await admin
        .from("classes")
        .select("id, name, grade_level")
        .eq("class_teacher_id", session.userId);
      ctClasses = c || [];
    } catch (err) {
      console.error("[teacher/timetables GET] classes query failed:", err);
    }

    // Fetch class subjects for subject teachers
    let csEntries: Array<{
      class_id: string;
      subject_id: string;
      subjects: { id: string; name: string; code: string | null } | null;
      classes: { id: string; name: string; grade_level: string } | null;
    }> = [];
    try {
      const { data: cs } = await admin
        .from("class_subjects")
        .select("class_id, subject_id, subjects(id, name, code), classes:class_id(id, name, grade_level)")
        .eq("teacher_id", session.userId);
      csEntries = cs || [];
    } catch (err) {
      console.error("[teacher/timetables GET] class_subjects query failed:", err);
    }

    // For staff with manage permission, also fetch all classes for the dropdown
    let allClasses: Array<{ id: string; name: string; grade_level: string }> = [];
    if (canManage) {
      try {
        const { data: ac } = await admin
          .from("classes")
          .select("id, name, grade_level")
          .order("grade_level", { ascending: true });
        allClasses = ac || [];
      } catch (err) {
        console.error("[teacher/timetables GET] all classes query failed:", err);
      }
    }

    return NextResponse.json({
      timetable: timetableEntries || [],
      classes: ctClasses,
      class_subjects: csEntries,
      all_classes: allClasses,
      can_manage: canManage,
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

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "timetables.manage");

    const admin = getSupabaseAdmin();
    const body = await req.json();

    const { class_id, subject_id, day_of_week, start_time, end_time, room, topic, teacher_id } = body;

    if (!class_id || !subject_id || !day_of_week || !start_time || !end_time) {
      return NextResponse.json({ error: "class_id, subject_id, day_of_week, start_time, and end_time are required" }, { status: 400 });
    }

    // Get user's campus_id
    const { data: profile } = await admin
      .from("profiles")
      .select("campus_id")
      .eq("id", session.userId)
      .maybeSingle();

    const { data, error } = await admin
      .from("timetable")
      .insert({
        class_id,
        subject_id,
        day_of_week,
        start_time,
        end_time,
        room: room || null,
        topic: topic || null,
        teacher_id: teacher_id || session.userId,
        campus_id: profile?.campus_id || "",
        created_by: session.userId,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[teacher/timetables POST] Supabase error:", error);
      return NextResponse.json({ error: "Failed to create timetable entry" }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[teacher/timetables POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "timetables.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Timetable entry ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { class_id, subject_id, day_of_week, start_time, end_time, room, topic, teacher_id } = body;

    const updateData: {
      class_id?: string;
      subject_id?: string;
      day_of_week?: number;
      start_time?: string;
      end_time?: string;
      room?: string | null;
      topic?: string | null;
      teacher_id?: string | null;
    } = {};
    if (class_id !== undefined) updateData.class_id = class_id;
    if (subject_id !== undefined) updateData.subject_id = subject_id;
    if (day_of_week !== undefined) updateData.day_of_week = day_of_week;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (room !== undefined) updateData.room = room || null;
    if (topic !== undefined) updateData.topic = topic || null;
    if (teacher_id !== undefined) updateData.teacher_id = teacher_id || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("timetable")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[teacher/timetables PUT] Supabase error:", error);
      return NextResponse.json({ error: "Failed to update timetable entry" }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[teacher/timetables PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "timetables.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Timetable entry ID is required" }, { status: 400 });
    }

    const { error } = await admin.from("timetable").delete().eq("id", id);
    if (error) {
      console.error("[teacher/timetables DELETE] Supabase error:", error);
      return NextResponse.json({ error: "Failed to delete timetable entry" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[teacher/timetables DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
