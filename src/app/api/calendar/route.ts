import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const event_type = searchParams.get("event_type");

    let query = admin.from("calendar_events").select("*");
    if (event_type) query = query.eq("event_type", event_type);

    const { data, error } = await query.order("start_date", { ascending: true });
    if (error) return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    return NextResponse.json({ events: data || [] });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[calendar GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "calendar.manage");

    const admin = getSupabaseAdmin();
    const body = await req.json();

    interface CalendarInsertRow {
      title: string;
      description: string | null;
      start_date: string;
      end_date: string | null;
      event_type: string;
      target_audience: string;
      target_grade: string | null;
      campus_id: string | null;
      attachments: Record<string, any> | null;
      created_by: string;
    }

    const { data, error } = await admin.from("calendar_events").insert({
      title: body.title,
      description: body.description || null,
      start_date: body.start_date,
      end_date: body.end_date || null,
      event_type: body.event_type || "general",
      target_audience: body.target_audience || "all",
      target_grade: body.target_grade || null,
      campus_id: body.campus_id || null,
      attachments: body.attachments || null,
      created_by: session.userId,
    } as CalendarInsertRow).select().maybeSingle();

    if (error) return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
    return NextResponse.json({ success: true, event: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[calendar POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "calendar.manage");

    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Event ID required" }, { status: 400 });

    const { data, error } = await admin.from("calendar_events").update(updates).eq("id", id).select().maybeSingle();
    if (error) return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
    return NextResponse.json({ success: true, event: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[calendar PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "calendar.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Event ID required" }, { status: 400 });

    const { error } = await admin.from("calendar_events").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[calendar DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
