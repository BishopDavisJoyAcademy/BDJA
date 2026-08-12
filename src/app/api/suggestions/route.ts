import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    let query = admin.from("suggestions").select("*, profiles(full_name)");

    if (session.userCategory !== "admin") {
      query = query.eq("user_id", session.userId);
    }

    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    return NextResponse.json({ suggestions: data || [] });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[suggestions GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const identifier = getClientIP(req) + ":suggestions";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.suggestions);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many suggestions. Try again later." }, { status: 429 });
    }

    const body = await req.json();
    const { type, title, description, priority } = body;

    if (!type || !title || !description) {
      return NextResponse.json({ error: "Type, title, and description are required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("suggestions").insert({
      user_id: session.userId,
      type,
      title,
      description,
      priority: priority || "medium",
      status: "pending",
    }).select().maybeSingle();

    if (error) return NextResponse.json({ error: "Failed to create suggestion" }, { status: 500 });
    return NextResponse.json({ success: true, suggestion: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[suggestions POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "suggestions.manage");

    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { id, admin_response, status: newStatus } = body;

    if (!id) {
      return NextResponse.json({ error: "Suggestion ID required" }, { status: 400 });
    }

    const updates: any = {};
    if (admin_response !== undefined) updates.admin_response = admin_response;
    if (newStatus !== undefined) updates.status = newStatus;
    updates.responded_by = session.userId;
    updates.responded_at = new Date().toISOString();
    updates.updated_at = new Date().toISOString();

    const { data, error } = await admin.from("suggestions").update(updates).eq("id", id).select().maybeSingle();
    if (error) return NextResponse.json({ error: "Failed to update suggestion" }, { status: 500 });
    return NextResponse.json({ success: true, suggestion: data });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[suggestions PATCH] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
