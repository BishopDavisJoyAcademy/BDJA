import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getClientIP } from "@/lib/security";
import { RuntimeError } from "@/lib/errors";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "errors.view");
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const resolved = searchParams.get("resolved");
    const source = searchParams.get("source");

    let query = admin.from("runtime_errors").select("*").order("timestamp", { ascending: false });
    if (resolved !== null) query = query.eq("resolved", resolved === "true");
    if (source) query = query.eq("source", source);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch errors" }, { status: 500 });
    return NextResponse.json({ errors: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? getErrorMessage(error) : "Authentication failed";
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: message }, { status: (error as AuthRequiredError & { statusCode?: number }).statusCode || 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("runtime_errors").insert([{
      message: body.message,
      stack: body.stack || null,
      component: body.component || null,
      url: body.url || "unknown",
      user_id: body.userId || null,
      user_email: body.userEmail || null,
      source: body.source || "client",
      resolved: false,
      timestamp: new Date().toISOString(),
    }]).select().single();

    if (error) return NextResponse.json({ error: "Failed to log error" }, { status: 500 });
    return NextResponse.json({ success: true, error: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? getErrorMessage(error) : "Failed to log error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "errors.manage");
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Error ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.resolved !== undefined) updateData.resolved = body.resolved;
    if (body.joy_analysis !== undefined) updateData.joy_analysis = body.joy_analysis;

    const { error } = await admin.from("runtime_errors").update(updateData).eq("id", body.id);
    if (error) return NextResponse.json({ error: "Failed to update error" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? getErrorMessage(error) : "Authentication failed";
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: message }, { status: (error as AuthRequiredError & { statusCode?: number }).statusCode || 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "errors.manage");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Error ID required" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { error } = await admin.from("runtime_errors").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to delete error" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? getErrorMessage(error) : "Authentication failed";
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: message }, { status: (error as AuthRequiredError & { statusCode?: number }).statusCode || 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
