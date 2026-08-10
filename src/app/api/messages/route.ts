import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "inbox";

    let query;
    if (type === "sent") {
      query = admin.from("messages").select("*, recipient:receiver_id(full_name, email)").eq("sender_id", session.userId);
    } else {
      query = admin.from("messages").select("*, sender:sender_id(full_name, email)").eq("receiver_id", session.userId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    return NextResponse.json({ messages: data || [] });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[messages GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();

    const { data, error } = await admin.from("messages").insert({
      ...body,
      sender_id: session.userId,
    }).select().maybeSingle();

    if (error) return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    return NextResponse.json({ success: true, message: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[messages POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
