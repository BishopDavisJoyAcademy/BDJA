import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { z } from "zod";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

const attendanceInsertSchema = z.object({
  student_id: z.string().uuid("Valid student ID is required"),
  class_id: z.string().uuid("Valid class ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  status: z.enum(["present", "absent", "late", "excused"]),
  notes: z.string().nullable().optional(),
  subject_id: z.string().uuid().nullable().optional(),
});

const attendanceUpdateSchema = z.object({
  status: z.enum(["present", "absent", "late", "excused"]).optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");
    const date = searchParams.get("date");
    const studentId = searchParams.get("student_id");

    let query = admin
      .from("attendance")
      .select("*, classes:class_id(name, grade_level)");

    if (classId) query = query.eq("class_id", classId);
    if (date) query = query.eq("date", date);
    if (studentId) query = query.eq("student_id", studentId);

    // Students can only see their own attendance
    if (session.userCategory === "student") {
      query = query.eq("student_id", session.userId);
    }
    // Parents can see their children's attendance
    if (session.userCategory === "parent") {
      const { data: children } = await admin
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", session.userId);
      const childIds = (children || []).map((c) => c.student_id);
      if (childIds.length > 0) query = query.in("student_id", childIds);
    }

    const { data, error } = await query.order("date", { ascending: false });
    if (error) {
      console.error("[attendance GET] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
    }
    return NextResponse.json({ attendance: data || [] });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[attendance GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "attendance.manage");

    const admin = getSupabaseAdmin();
    const rawBody = await req.json();

    const parseResult = attendanceInsertSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const insertData = {
      ...parseResult.data,
      marked_by: session.userId,
    };

    const { data, error } = await admin
      .from("attendance")
      .insert(insertData)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[attendance POST] Supabase error:", error);
      return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 });
    }
    return NextResponse.json({ success: true, attendance: data });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[attendance POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "attendance.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Attendance record ID is required" }, { status: 400 });
    }

    const rawBody = await req.json();
    const parseResult = attendanceUpdateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updateData = parseResult.data;

    const { data, error } = await admin
      .from("attendance")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[attendance PUT] Supabase error:", error);
      return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
    }
    return NextResponse.json({ success: true, attendance: data });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[attendance PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "attendance.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Attendance record ID is required" }, { status: 400 });
    }

    const { error } = await admin.from("attendance").delete().eq("id", id);
    if (error) {
      console.error("[attendance DELETE] Supabase error:", error);
      return NextResponse.json({ error: "Failed to delete attendance record" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[attendance DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
