import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const SORT_MAP: Record<string, string> = {
  name: "full_name",
  category: "user_category",
  status: "is_active",
  created: "created_at",
  last_login: "last_login_at",
};

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const searchQuery = searchParams.get("q");
    const rawSort = searchParams.get("sort") || "created";
    const dir = searchParams.get("dir") || "desc";
    const sort = SORT_MAP[rawSort] || "created_at";

    let query = admin
      .from("profiles")
      .select("*, staff(department, designation, employee_id, status), students(admission_number, grade_level, class_id, status), campuses(name)")
      .order(sort, { ascending: dir === "asc" });

    if (category && category !== "all") {
      query = query.eq("user_category", category);
    }

    if (status === "active") {
      query = query.eq("is_active", true);
    } else if (status === "inactive") {
      query = query.eq("is_active", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[users GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    let result = data || [];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row: Record<string, unknown>) => {
        const fullName = String(row.full_name || "").toLowerCase();
        const email = String(row.email || "").toLowerCase();
        const admission = String((row.students as Record<string, unknown> | null)?.admission_number || "").toLowerCase();
        const employeeId = String((row.staff as Record<string, unknown> | null)?.employee_id || "").toLowerCase();
        return fullName.includes(q) || email.includes(q) || admission.includes(q) || employeeId.includes(q);
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
      password_changed: row.password_changed,
      campus_id: row.campus_id,
      campus_name: (row.campuses as Record<string, unknown> | null)?.name || null,
      avatar_url: row.avatar_url,
      created_at: row.created_at,
      last_login_at: row.last_login_at,
      staff: row.staff || null,
      students: row.students || null,
    }));

    return NextResponse.json({ users, total: users.length });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[users GET] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (session.userCategory !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    if (id === session.userId) {
      return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 403 });
    }

    const updateData: { is_active?: boolean } = {};
    if (typeof is_active === "boolean") updateData.is_active = is_active;

    const { data, error } = await admin
      .from("profiles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[users PATCH] Error:", error.message);
      return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
    }

    if (is_active === false) {
      await admin
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString(), revoked_reason: "Account deactivated by admin" })
        .eq("user_id", id)
        .is("revoked_at", null);
    }

    await logAudit({
      user_id: session.userId,
      action: is_active === false ? "USER_DEACTIVATED" : "USER_ACTIVATED",
      table_name: "profiles",
      record_id: id,
      new_data: updateData,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, user: data });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[users PATCH] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
