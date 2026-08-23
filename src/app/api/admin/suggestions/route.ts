import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    if (!(await hasPermission(user.id, "suggestions.manage"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    let query = admin
      .from("suggestions")
      .select("*, profiles(full_name, email, user_category)")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }

    return NextResponse.json({ suggestions: data || [] });
  } catch (error: unknown) {
    console.error("[api/admin/suggestions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    if (!(await hasPermission(user.id, "suggestions.manage"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, priority, admin_response } = body;

    if (!id) {
      return NextResponse.json({ error: "Suggestion ID required" }, { status: 400 });
    }

    const updates: Record<string, string | boolean | null | undefined> = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (admin_response !== undefined) {
      updates.admin_response = admin_response;
      updates.responded_by = user.id;
      updates.responded_at = new Date().toISOString();
    }

    const { error } = await admin
      .from("suggestions")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to update suggestion" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[api/admin/suggestions] PATCH Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
