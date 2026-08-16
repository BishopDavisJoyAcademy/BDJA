import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const type = searchParams.get("type");

    if (id) {
      const { data, error } = await admin.from("calendar_events").select("*").eq("id", id).maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Event not found" }, { status: 404 });
      return NextResponse.json({ event: data });
    }

    let query = admin.from("calendar_events").select("*");
    if (start && end) query = query.gte("start_date", start).lte("start_date", end);
    if (type) query = query.eq("event_type", type);
    const { data: events, error } = await query.order("start_date", { ascending: true });
    if (error) return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    return NextResponse.json({ events: events || [] });
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    console.error("[calendar GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();
    if (!body.title || !body.start_date) return NextResponse.json({ error: "Title and start date are required" }, { status: 400 });
    const { data, error } = await admin.from("calendar_events").insert([{
      title: body.title, description: body.description || null, start_date: body.start_date,
      end_date: body.end_date || null, event_type: body.event_type || "general",
      target_audience: body.target_audience || "all", target_grade: body.target_grade || null,
      campus_id: body.campus_id || null, created_by: session.userId,
    }]).select().single();
    if (error) return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
    await logAudit({ user_id: session.userId, action: "CALENDAR_EVENT_CREATED", table_name: "calendar_events", record_id: data.id, new_data: { title: body.title }, ip_address: getClientIP(req) });
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    console.error("[calendar POST] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to create event" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    const { error } = await admin.from("calendar_events").update({
      title: body.title, description: body.description || null, start_date: body.start_date,
      end_date: body.end_date || null, event_type: body.event_type || "general",
      target_audience: body.target_audience || "all", target_grade: body.target_grade || null,
      campus_id: body.campus_id || null, updated_at: new Date().toISOString(),
    }).eq("id", body.id);
    if (error) return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
    await logAudit({ user_id: session.userId, action: "CALENDAR_EVENT_UPDATED", table_name: "calendar_events", record_id: body.id, ip_address: getClientIP(req) });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    console.error("[calendar PUT] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    const { error } = await admin.from("calendar_events").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
    await logAudit({ user_id: session.userId, action: "CALENDAR_EVENT_DELETED", table_name: "calendar_events", record_id: id, ip_address: getClientIP(req) });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    console.error("[calendar DELETE] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to delete event" }, { status: 500 });
  }
}
