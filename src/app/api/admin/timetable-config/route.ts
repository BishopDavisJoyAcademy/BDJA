import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError, ValidationError } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Public read — no auth required for config
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("timetable_config")
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[timetable-config GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch timetable config" }, { status: 500 });
    }

    // Also fetch subjects with colors for the builder
    const { data: subjects, error: subjErr } = await admin
      .from("subjects")
      .select("id, name, code, color")
      .order("name", { ascending: true });

    if (subjErr) {
      console.error("[timetable-config GET] Subjects error:", subjErr.message);
    }

    return NextResponse.json({
      config: data || null,
      subjects: subjects || [],
    });
  } catch (error: unknown) {
    console.error("[timetable-config GET] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "settings.manage");

    const body = await req.json();
    const admin = getSupabaseAdmin();

    const { data: existing } = await admin
      .from("timetable_config")
      .select("id")
      .maybeSingle();

    const payload = {
      school_days: Array.isArray(body.school_days) ? body.school_days : undefined,
      time_slots: Array.isArray(body.time_slots) ? body.time_slots : undefined,
      lesson_duration_minutes: typeof body.lesson_duration_minutes === "number" ? body.lesson_duration_minutes : undefined,
      terms: Array.isArray(body.terms) ? body.terms : undefined,
      academic_year: typeof body.academic_year === "string" ? body.academic_year : undefined,
      start_time: typeof body.start_time === "string" ? body.start_time : undefined,
      end_time: typeof body.end_time === "string" ? body.end_time : undefined,
      grade_levels: Array.isArray(body.grade_levels) ? body.grade_levels : undefined,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    );

    let result;
    if (existing) {
      const { data, error } = await admin
        .from("timetable_config")
        .update(cleanPayload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new ValidationError(error.message);
      result = data;
    } else {
      const { data, error } = await admin
        .from("timetable_config")
        .insert(cleanPayload)
        .select()
        .single();
      if (error) throw new ValidationError(error.message);
      result = data;
    }

    await logAudit({
      user_id: session.userId,
      action: "TIMETABLE_CONFIG_UPDATED",
      table_name: "timetable_config",
      record_id: result.id,
      new_data: cleanPayload,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, config: result });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
    }
    console.error("[timetable-config PUT] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
