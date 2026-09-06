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
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const searchQuery = searchParams.get("q");

    let query = admin
      .from("profiles")
      .select("*, staff(department, designation, employee_id), students(admission_number, grade_level), campuses(name)")
      .order("created_at", { ascending: false });

    if (category && category !== "all") query = query.eq("user_category", category);
    if (status === "active") query = query.eq("is_active", true);
    if (status === "inactive") query = query.eq("is_active", false);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });

    let result = data || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row: Record<string, unknown>) => {
        const fullName = String(row.full_name || "").toLowerCase();
        const email = String(row.email || "").toLowerCase();
        return fullName.includes(q) || email.includes(q);
      });
    }

    const users = result.map((row: Record<string, unknown>) => ({
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      user_category: row.user_category,
      is_active: row.is_active,
      campus_id: row.campus_id,
      campus_name: (row.campuses as Record<string, unknown> | null)?.name || null,
      avatar_url: row.avatar_url,
      created_at: row.created_at,
      last_login_at: row.last_login_at,
      staff: row.staff || null,
      students: row.students || null,
    }));

    return NextResponse.json({ users });
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

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "users.edit");

    const body = await req.json();
    const { userIds, action } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "userIds array required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const isActive = action === "activate";

    // Prevent self-deactivation
    if (!isActive && userIds.includes(session.userId)) {
      return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 403 });
    }

    const { error } = await admin
      .from("profiles")
      .update({ is_active: isActive })
      .in("id", userIds);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Revoke sessions for deactivated users
    if (!isActive) {
      await admin
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString(), revoked_reason: "Bulk deactivation by admin" })
        .in("user_id", userIds)
        .is("revoked_at", null);
    }

    await logAudit({
      user_id: session.userId,
      action: `BULK_${action.toUpperCase()}`,
      table_name: "profiles",
      new_data: { userIds, action },
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, count: userIds.length });
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
