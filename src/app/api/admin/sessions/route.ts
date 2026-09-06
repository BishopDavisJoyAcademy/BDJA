import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "users.view");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("user_sessions")
      .select("id, user_id, device_info, ip_address, created_at, last_active_at, revoked_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });

    return NextResponse.json({ sessions: data || [] });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "users.edit");

    const body = await req.json();
    const { sessionId, userId, revokeAll } = body;

    const admin = getSupabaseAdmin();

    if (revokeAll && userId) {
      const { error } = await admin
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString(), revoked_reason: "Revoked by admin via Sovereign View" })
        .eq("user_id", userId)
        .is("revoked_at", null);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await logAudit({
        user_id: session.userId,
        action: "REVOKE_ALL_SESSIONS",
        table_name: "user_sessions",
        record_id: userId,
        ip_address: getClientIP(req),
      });

      return NextResponse.json({ success: true, revokedAll: true });
    }

    if (sessionId) {
      const { error } = await admin
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString(), revoked_reason: "Revoked by admin via Sovereign View" })
        .eq("id", sessionId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await logAudit({
        user_id: session.userId,
        action: "REVOKE_SESSION",
        table_name: "user_sessions",
        record_id: sessionId,
        ip_address: getClientIP(req),
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "sessionId or userId+revokeAll required" }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
