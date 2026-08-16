import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    let query = admin.from("suggestions").select("*");
    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    return NextResponse.json({ suggestions: data || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();
    if (!body.title || !body.description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }
    const { data, error } = await admin.from("suggestions").insert([{
      title: body.title,
      description: body.description,
      type: body.type || "general",
      priority: body.priority || "medium",
      status: "open",
      user_id: session.userId,
    }]).select().single();
    if (error) return NextResponse.json({ error: "Failed to create suggestion" }, { status: 500 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Suggestion ID required" }, { status: 400 });

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status !== undefined) updateData.status = body.status;
    if (body.admin_response !== undefined) {
      updateData.admin_response = body.admin_response;
      updateData.responded_by = session.userId;
      updateData.responded_at = new Date().toISOString();
    }

    const { error } = await admin.from("suggestions").update(updateData).eq("id", body.id);
    if (error) return NextResponse.json({ error: "Failed to update suggestion" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
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
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
