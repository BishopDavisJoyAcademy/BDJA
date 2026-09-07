"use server";

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface TimetableSlot {
  id: string;
  class_id: string;
  subject_name: string;
  teacher_id: string | null;
  room: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  academic_year: string;
  term: string;
  campus_id: string | null;
  is_active: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Conflict {
  type: "teacher" | "room" | "class";
  message: string;
  conflictingSlotId: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TERMS = ["Term 1", "Term 2", "Term 3"];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

async function detectConflicts(
  admin: ReturnType<typeof getSupabaseAdmin>,
  slot: Omit<TimetableSlot, "id" | "created_at" | "updated_at" | "created_by">,
  excludeId?: string
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];

  const { data: existingSlots } = await admin
    .from("timetable_slots")
    .select("id, class_id, teacher_id, room, day_of_week, start_time, end_time, subject_name")
    .eq("day_of_week", slot.day_of_week)
    .eq("academic_year", slot.academic_year)
    .eq("term", slot.term)
    .eq("is_active", true);

  if (!existingSlots || existingSlots.length === 0) return conflicts;

  for (const existing of existingSlots) {
    if (excludeId && existing.id === excludeId) continue;
    if (!timesOverlap(slot.start_time, slot.end_time, existing.start_time, existing.end_time)) continue;

    if (slot.teacher_id && existing.teacher_id && slot.teacher_id === existing.teacher_id) {
      conflicts.push({
        type: "teacher",
        message: `Teacher is already assigned to "${existing.subject_name}" (${existing.start_time}-${existing.end_time})`,
        conflictingSlotId: existing.id,
      });
    }

    if (slot.room && existing.room && slot.room === existing.room) {
      conflicts.push({
        type: "room",
        message: `Room "${existing.room}" is already booked for "${existing.subject_name}" (${existing.start_time}-${existing.end_time})`,
        conflictingSlotId: existing.id,
      });
    }

    if (slot.class_id === existing.class_id) {
      conflicts.push({
        type: "class",
        message: `Class already has "${existing.subject_name}" (${existing.start_time}-${existing.end_time})`,
        conflictingSlotId: existing.id,
      });
    }
  }

  return conflicts;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");
    const teacherId = searchParams.get("teacher_id");
    const academicYear = searchParams.get("academic_year");
    const term = searchParams.get("term");
    const day = searchParams.get("day_of_week");
    const withConflicts = searchParams.get("conflicts") === "true";

    let query = admin
      .from("timetable_slots")
      .select("*, classes(name, grade_level), profiles!timetable_slots_teacher_id_fkey(full_name)")
      .eq("is_active", true)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (classId) query = query.eq("class_id", classId);
    if (teacherId) query = query.eq("teacher_id", teacherId);
    if (academicYear) query = query.eq("academic_year", academicYear);
    if (term) query = query.eq("term", term);
    if (day) query = query.eq("day_of_week", Number(day));

    const { data: slots, error } = await query;

    if (error) {
      console.error("[timetable GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch timetable slots" }, { status: 500 });
    }

    return NextResponse.json({
      slots: slots || [],
      days: DAYS,
      terms: TERMS,
    });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[timetable GET] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action || "create";

    if (action === "check_conflicts") {
      return handleCheckConflicts(body);
    }
    if (action === "bulk_create") {
      return handleBulkCreate(body, session, req);
    }
    if (action !== "create") {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return handleCreateSlot(body, session, req);
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 400 });
    }
    console.error("[timetable POST] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

async function handleCheckConflicts(body: Record<string, unknown>) {
  const admin = getSupabaseAdmin();

  const slot = {
    class_id: String(body.class_id || ""),
    subject_name: String(body.subject_name || "").trim(),
    teacher_id: body.teacher_id ? String(body.teacher_id) : null,
    room: body.room ? String(body.room).trim() : null,
    day_of_week: Number(body.day_of_week ?? 0),
    start_time: String(body.start_time || ""),
    end_time: String(body.end_time || ""),
    academic_year: String(body.academic_year || ""),
    term: String(body.term || ""),
    campus_id: body.campus_id ? String(body.campus_id) : null,
    is_active: true,
  };

  const excludeId = body.exclude_id ? String(body.exclude_id) : undefined;
  const conflicts = await detectConflicts(admin, slot, excludeId);

  return NextResponse.json({ conflicts, hasConflicts: conflicts.length > 0 });
}

async function handleCreateSlot(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();

  const classId = String(body.class_id || "").trim();
  const subjectName = String(body.subject_name || "").trim();
  const teacherId = body.teacher_id ? String(body.teacher_id) : null;
  const room = body.room ? String(body.room).trim() : null;
  const dayOfWeek = Number(body.day_of_week ?? -1);
  const startTime = String(body.start_time || "").trim();
  const endTime = String(body.end_time || "").trim();
  const academicYear = String(body.academic_year || "").trim();
  const term = String(body.term || "").trim();
  const campusId = body.campus_id ? String(body.campus_id) : null;

  if (!classId) throw new ValidationError("Class is required");
  if (!subjectName) throw new ValidationError("Subject name is required");
  if (dayOfWeek < 0 || dayOfWeek > 5) throw new ValidationError("Day of week must be 0-5 (Monday-Saturday)");
  if (!startTime) throw new ValidationError("Start time is required");
  if (!endTime) throw new ValidationError("End time is required");
  if (!academicYear) throw new ValidationError("Academic year is required");
  if (!term) throw new ValidationError("Term is required");

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (endMinutes <= startMinutes) {
    throw new ValidationError("End time must be after start time");
  }

  const conflicts = await detectConflicts(admin, {
    class_id: classId,
    subject_name: subjectName,
    teacher_id: teacherId,
    room,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    academic_year: academicYear,
    term,
    campus_id: campusId,
    is_active: true,
  });

  if (conflicts.length > 0 && body.allow_conflicts !== true) {
    return NextResponse.json(
      { error: "Conflicts detected", conflicts },
      { status: 409 }
    );
  }

  const { data, error } = await admin.from("timetable_slots").insert({
    class_id: classId,
    subject_name: subjectName,
    teacher_id: teacherId,
    room,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    academic_year: academicYear,
    term,
    campus_id: campusId,
    is_active: true,
    created_by: session.userId,
  }).select().single();

  if (error) {
    console.error("[timetable POST] Create error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to create timetable slot" }, { status: 500 });
  }

  await logAudit({
    user_id: session.userId,
    action: "TIMETABLE_SLOT_CREATED",
    table_name: "timetable_slots",
    record_id: data.id,
    new_data: body,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({ success: true, slot: data, conflicts: conflicts.length > 0 ? conflicts : undefined });
}

async function handleBulkCreate(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();
  const slots = body.slots as Array<Record<string, unknown>>;

  if (!Array.isArray(slots) || slots.length === 0) {
    throw new ValidationError("Slots array is required");
  }

  const createdSlots: TimetableSlot[] = [];
  const allConflicts: Array<{ slotIndex: number; conflicts: Conflict[] }> = [];

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const slotData = {
      class_id: String(s.class_id || "").trim(),
      subject_name: String(s.subject_name || "").trim(),
      teacher_id: s.teacher_id ? String(s.teacher_id) : null,
      room: s.room ? String(s.room).trim() : null,
      day_of_week: Number(s.day_of_week ?? -1),
      start_time: String(s.start_time || "").trim(),
      end_time: String(s.end_time || "").trim(),
      academic_year: String(s.academic_year || "").trim(),
      term: String(s.term || "").trim(),
      campus_id: s.campus_id ? String(s.campus_id) : null,
      is_active: true,
    };

    const conflicts = await detectConflicts(admin, slotData);
    if (conflicts.length > 0) {
      allConflicts.push({ slotIndex: i, conflicts });
      if (body.allow_conflicts !== true) continue;
    }

    const { data, error } = await admin.from("timetable_slots").insert({
      ...slotData,
      created_by: session.userId,
    }).select().single();

    if (error) {
      console.error(`[timetable POST] Bulk create error at index ${i}:`, error.message);
      continue;
    }

    if (data) createdSlots.push(data as TimetableSlot);
  }

  await logAudit({
    user_id: session.userId,
    action: "TIMETABLE_BULK_CREATED",
    table_name: "timetable_slots",
    new_data: { count: createdSlots.length, total: slots.length },
    ip_address: getClientIP(req),
  });

  return NextResponse.json({
    success: true,
    created: createdSlots.length,
    total: slots.length,
    slots: createdSlots,
    conflicts: allConflicts.length > 0 ? allConflicts : undefined,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Slot ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { data: existing } = await admin
      .from("timetable_slots")
      .select("*")
      .eq("id", id)
      .single();

    if (!existing) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

    const updateData: Partial<TimetableSlot> = {};

    if (updates.class_id !== undefined) updateData.class_id = String(updates.class_id).trim();
    if (updates.subject_name !== undefined) updateData.subject_name = String(updates.subject_name).trim();
    if (updates.teacher_id !== undefined) updateData.teacher_id = updates.teacher_id ? String(updates.teacher_id) : null;
    if (updates.room !== undefined) updateData.room = updates.room ? String(updates.room).trim() : null;
    if (updates.day_of_week !== undefined) updateData.day_of_week = Number(updates.day_of_week);
    if (updates.start_time !== undefined) updateData.start_time = String(updates.start_time).trim();
    if (updates.end_time !== undefined) updateData.end_time = String(updates.end_time).trim();
    if (updates.academic_year !== undefined) updateData.academic_year = String(updates.academic_year).trim();
    if (updates.term !== undefined) updateData.term = String(updates.term).trim();
    if (updates.campus_id !== undefined) updateData.campus_id = updates.campus_id ? String(updates.campus_id) : null;
    if (updates.is_active !== undefined) updateData.is_active = Boolean(updates.is_active);

    const effectiveSlot = { ...existing, ...updateData };
    const conflicts = await detectConflicts(admin, effectiveSlot, id);

    if (conflicts.length > 0 && body.allow_conflicts !== true) {
      return NextResponse.json(
        { error: "Conflicts detected", conflicts },
        { status: 409 }
      );
    }

    const { error } = await admin.from("timetable_slots").update(updateData).eq("id", id);

    if (error) {
      console.error("[timetable PATCH] Update error:", error.message);
      return NextResponse.json({ error: "Failed to update slot" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "TIMETABLE_SLOT_UPDATED",
      table_name: "timetable_slots",
      record_id: id,
      old_data: existing,
      new_data: updateData,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, conflicts: conflicts.length > 0 ? conflicts : undefined });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[timetable PATCH] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Slot ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { error } = await admin.from("timetable_slots").delete().eq("id", id);

    if (error) {
      console.error("[timetable DELETE] Error:", error.message);
      return NextResponse.json({ error: "Failed to delete slot" }, { status: 500 });
    }

    await logAudit({
      user_id: session.userId,
      action: "TIMETABLE_SLOT_DELETED",
      table_name: "timetable_slots",
      record_id: id,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[timetable DELETE] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
