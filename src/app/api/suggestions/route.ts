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
    const status = searchParams.get("status");

    if (id) {
      const { data, error } = await admin.from("suggestions").select("*, profiles(full_name)").eq("id", id).maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
      return NextResponse.json({ suggestion: data });
    }

    let query = admin.from("suggestions").select("*, profiles(full_name)").order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data: suggestions, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    return NextResponse.json({ suggestions: suggestions || [] });
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    console.error("[suggestions GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();
    if (!body.title || !body.description) return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    const { data, error } = await admin.from("suggestions").insert([{
      title: body.title, description: body.description, type: body.type || "general",
      priority: body.priority || "medium", status: "open", created_by: session.userId,
    }]).select().single();
    if (error) return NextResponse.json({ error: "Failed to create suggestion" }, { status: 500 });
    await logAudit({ user_id: session.userId, action: "SUGGESTION_CREATED", table_name: "suggestions", record_id: data.id, new_data: { title: body.title }, ip_address: getClientIP(req) });
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    console.error("[suggestions POST] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to create suggestion" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Suggestion ID required" }, { status: 400 });
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) updateData.status = body.status;
    if (body.admin_response !== undefined) updateData.admin_response = body.admin_response;
    const { error } = await admin.from("suggestions").update(updateData).eq("id", body.id);
    if (error) return NextResponse.json({ error: "Failed to update suggestion" }, { status: 500 });
    await logAudit({ user_id: session.userId, action: "SUGGESTION_UPDATED", table_name: "suggestions", record_id: body.id, ip_address: getClientIP(req) });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    console.error("[suggestions PATCH] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to update suggestion" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Suggestion ID required" }, { status: 400 });
    const { error } = await admin.from("suggestions").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to delete suggestion" }, { status: 500 });
    await logAudit({ user_id: session.userId, action: "SUGGESTION_DELETED", table_name: "suggestions", record_id: id, ip_address: getClientIP(req) });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error.name === "AuthRequiredError") return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    console.error("[suggestions DELETE] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to delete suggestion" }, { status: 500 });
  }
}
