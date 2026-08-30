import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createClient } from "@/lib/supabase-client";
import { hasPermission } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

async function authenticate(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (token) {
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (!error && user) return user.id;
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) return user.id;
  } catch {
    // ignore
  }

  return null;
}

/* ─── GET ─── */
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermission(userId, "suggestions.manage"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    let query = getSupabaseAdmin()
      .from("suggestions")
      .select("*, profiles!suggestions_user_id_fkey(full_name, email, user_category)")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) {
      console.error("[admin/suggestions GET] Query error:", error);
      return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }

    return NextResponse.json({ suggestions: data || [] });
  } catch (error: unknown) {
    console.error("[admin/suggestions GET] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Internal server error" },
      { status: 500 }
    );
  }
}

/* ─── PATCH ─── */
export async function PATCH(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermission(userId, "suggestions.manage"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, priority, admin_response } = body;

    if (!id) {
      return NextResponse.json({ error: "Suggestion ID required" }, { status: 400 });
    }

    interface SuggestionUpdate {
      status?: string;
      priority?: string;
      admin_response?: string;
      responded_by?: string;
      responded_at?: string;
      updated_at?: string;
    }

    const updates: SuggestionUpdate = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (admin_response !== undefined) {
      updates.admin_response = admin_response;
      updates.responded_by = userId;
      updates.responded_at = new Date().toISOString();
    }

    const { error } = await getSupabaseAdmin()
      .from("suggestions")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("[admin/suggestions PATCH] Update error:", error);
      return NextResponse.json({ error: "Failed to update suggestion" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[admin/suggestions PATCH] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Internal server error" },
      { status: 500 }
    );
  }
}

/* ─── DELETE ─── */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermission(userId, "suggestions.manage"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Suggestion ID required" }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin()
      .from("suggestions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[admin/suggestions DELETE] Error:", error);
      return NextResponse.json({ error: "Failed to delete suggestion" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[admin/suggestions DELETE] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Internal server error" },
      { status: 500 }
    );
  }
}
