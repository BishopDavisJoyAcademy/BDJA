import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    let query = admin.from("calendar_events").select("*");
    if (start) query = query.gte("start_date", start);
    if (end) query = query.lte("start_date", end);

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
    const { data, error } = await admin.from("calendar_events").insert({
      ...body,
      created_by: session.userId,
    }).select().single();

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
