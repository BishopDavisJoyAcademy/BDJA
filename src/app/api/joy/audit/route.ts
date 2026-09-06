import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const hasPerm = await hasPermission(session.userId, "audit.view");
    if (!hasPerm) {
      return NextResponse.json({ error: "audit.view permission required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const userId = searchParams.get("user_id");
    const actionType = searchParams.get("action_type");
    const toolName = searchParams.get("tool_name");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    let query = admin
      .from("joy_audit_logs")
      .select("*, profiles!joy_audit_logs_user_id_fkey(full_name, user_category)")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) query = query.eq("user_id", userId);
    if (actionType) query = query.eq("action_type", actionType);
    if (toolName) query = query.eq("tool_name", toolName);
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate);

    const { data: logs, error } = await query;
    if (error) throw error;

    // Get total count
    let countQuery = admin.from("joy_audit_logs").select("id", { count: "exact", head: true });
    if (userId) countQuery = countQuery.eq("user_id", userId);
    if (actionType) countQuery = countQuery.eq("action_type", actionType);
    if (startDate) countQuery = countQuery.gte("created_at", startDate);
    if (endDate) countQuery = countQuery.lte("created_at", endDate);

    const { count } = await countQuery;

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[joy/audit] Error:", getErrorMessage(error));
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
