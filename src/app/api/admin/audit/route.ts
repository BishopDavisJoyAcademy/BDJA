import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "audit.view");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = parseInt(searchParams.get("perPage") || "25", 10);
    const searchQuery = searchParams.get("q");
    const actionFilter = searchParams.get("action");
    const tableFilter = searchParams.get("table");
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");

    let query = admin.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });

    if (actionFilter && actionFilter !== "all") {
      query = query.ilike("action", `${actionFilter}%`);
    }

    if (tableFilter && tableFilter !== "all") {
      query = query.eq("table_name", tableFilter);
    }

    if (dateFrom) {
      query = query.gte("created_at", `${dateFrom}T00:00:00Z`);
    }

    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59Z`);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("[audit GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }

    let logs = data || [];

    // Resolve user names
    const userIds = [...new Set(logs.map((l: Record<string, unknown>) => l.user_id).filter(Boolean))];
    let userMap = new Map<string, { full_name: string; email: string }>();
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      (profiles || []).forEach((p: Record<string, unknown>) => {
        userMap.set(p.id as string, { full_name: p.full_name as string, email: p.email as string });
      });
    }

    const enrichedLogs = logs.map((log: Record<string, unknown>) => {
      const userInfo = log.user_id ? userMap.get(log.user_id as string) : null;
      return {
        ...log,
        user_name: userInfo?.full_name || null,
        user_email: userInfo?.email || null,
      };
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      enrichedLogs.filter((log: Record<string, unknown>) => {
        const userName = String(log.user_name || "").toLowerCase();
        const userEmail = String(log.user_email || "").toLowerCase();
        const action = String(log.action || "").toLowerCase();
        const table = String(log.table_name || "").toLowerCase();
        return userName.includes(q) || userEmail.includes(q) || action.includes(q) || table.includes(q);
      });
    }

    return NextResponse.json({
      logs: enrichedLogs,
      total: count || 0,
      page,
      perPage,
    });
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
