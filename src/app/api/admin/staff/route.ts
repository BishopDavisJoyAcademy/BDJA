import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createStaff } from "@/lib/auth";
import { grantPermissions } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, AuthRequiredError, PermissionDeniedError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

function generateStaffEmailFallback(fullName: string): string {
  const local = fullName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30) || `staff`;
  return `${local}-${Date.now().toString(36)}@bdja.staff.local`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "staff.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const statusFilter = searchParams.get("status");
    const departmentFilter = searchParams.get("department");
    const searchQuery = searchParams.get("q");

    if (id) {
      interface StaffDetailRow {
        id: string;
        email: string;
        full_name: string;
        role: string;
        user_category: string;
        campus_id: string | null;
        is_active: boolean;
        phone: string | null;
        password_changed: boolean;
        created_at: string | null;
        staff: Array<{
          department: string | null;
          designation: string | null;
          employee_id: string | null;
          status: string | null;
          join_date: string | null;
        }> | null;
      }

      const { data: staffRaw, error } = await admin
        .from("profiles")
        .select("*, staff(*)")
        .eq("id", id)
        .eq("user_category", "staff")
        .maybeSingle();

      const staff = staffRaw as StaffDetailRow | null;

      if (error) {
        console.error("[staff GET] Single fetch error:", error.message);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
      if (!staff) {
        return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
      }

      // Fetch permissions
      const { data: permData } = await admin
        .from("staff_permissions")
        .select("permissions(id, key, name, category)")
        .eq("profile_id", id);

      const permissions = (permData || []).map((p: Record<string, unknown>) => {
        const perm = p.permissions as Record<string, unknown> | null;
        return perm ? { id: perm.id, key: perm.key, name: perm.name, category: perm.category } : null;
      }).filter(Boolean);

      return NextResponse.json({ staff: { ...staff, permissions } });
    }

    let query = admin
      .from("profiles")
      .select("*, staff(*)")
      .eq("user_category", "staff")
      .order("created_at", { ascending: false });

    if (statusFilter === "active") {
      query = query.eq("is_active", true);
    } else if (statusFilter === "inactive") {
      query = query.eq("is_active", false);
    }

    if (departmentFilter && departmentFilter !== "all") {
      query = query.filter("staff.department", "eq", departmentFilter);
    }

    const { data: staff, error } = await query;

    if (error) {
      console.error("[staff GET] List fetch error:", error.message);
      return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
    }

    let result = staff || [];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row: Record<string, unknown>) => {
        const fullName = String(row.full_name || "").toLowerCase();
        const email = String(row.email || "").toLowerCase();
        const dept = String((row.staff as Record<string, unknown> | null)?.department || "").toLowerCase();
        const desig = String((row.staff as Record<string, unknown> | null)?.designation || "").toLowerCase();
        return fullName.includes(q) || email.includes(q) || dept.includes(q) || desig.includes(q);
      });
    }

    return NextResponse.json({ staff: result, count: result.length });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[staff GET] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "staff.manage");

    const body = await req.json();
    const action = body.action || "create";

    if (action === "generate_credentials") {
      return handleGenerateCredentials(body, session, req);
    }

    if (action !== "create") {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return handleCreateStaff(body, session, req);
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 400 });
    }
    console.error("[staff POST] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

async function handleCreateStaff(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const fullName = String(body.full_name || "").trim();
  let email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim() || undefined;
  const department = String(body.department || "").trim() || undefined;
  const designation = String(body.designation || "").trim() || undefined;
  const campusId = body.campus_id ? String(body.campus_id) : undefined;
  const permissionIds = Array.isArray(body.permissionIds)
    ? body.permissionIds.filter((id): id is string => typeof id === "string")
    : [];

  if (!fullName) {
    return NextResponse.json({ error: "Full name is required", field: "full_name" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Auto-generate email if not provided
  if (!email) {
    email = generateStaffEmailFallback(fullName);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email format", field: "email" }, { status: 400 });
  }

  // Check email uniqueness
  const { data: existingEmail } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingEmail) {
    return NextResponse.json(
      { error: `Email "${email}" is already in use`, field: "email" },
      { status: 409 }
    );
  }

  try {
    const result = await createStaff({
      email,
      fullName,
      phone,
      department,
      designation,
      campusId,
      permissionIds,
      createdBy: session.userId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || result.message, field: "email" },
        { status: 409 }
      );
    }

    await logAudit({
      user_id: session.userId,
      action: "STAFF_CREATED",
      table_name: "staff",
      record_id: result.userId,
      new_data: { email, department, designation, permissions: permissionIds },
      ip_address: getClientIP(req),
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: result.userId,
        email: result.email,
        full_name: fullName,
        department: department || "General",
        designation: designation || "Staff",
      },
      credentials: {
        email: result.email,
        tempPassword: result.tempPassword,
      },
      message: "Staff created successfully. Credentials displayed below.",
    });
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("[staff POST] Create failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleGenerateCredentials(
  body: Record<string, unknown>,
  session: Awaited<ReturnType<typeof requireAuth>>,
  req: NextRequest
) {
  const admin = getSupabaseAdmin();
  const id = String(body.id || "");

  if (!id) {
    return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
  }

  // Verify staff exists
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, full_name, user_category")
    .eq("id", id)
    .eq("user_category", "staff")
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  // Generate new temp password
  const { generateTempPassword, hashPassword } = await import("@/lib/security");
  const newPassword = generateTempPassword();
  const passwordHash = await hashPassword(newPassword);

  // Update auth user password
  const { error: updateAuthError } = await admin.auth.admin.updateUserById(id, {
    password: newPassword,
  });

  if (updateAuthError) {
    console.error("[staff credentials] Auth update failed:", updateAuthError.message);
    return NextResponse.json({ error: "Failed to update auth password" }, { status: 500 });
  }

  // Update profile
  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({
      temp_password_hash: passwordHash,
      password_changed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (profileUpdateError) {
    console.error("[staff credentials] Profile update failed:", profileUpdateError.message);
  }

  await logAudit({
    user_id: session.userId,
    action: "STAFF_CREDENTIALS_REGENERATED",
    table_name: "staff",
    record_id: id,
    ip_address: getClientIP(req),
  });

  return NextResponse.json({
    success: true,
    credentials: {
      email: profile.email,
      tempPassword: newPassword,
    },
    message: "New credentials generated successfully",
  });
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "staff.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Staff ID required" }, { status: 400 });
    }

    const body = await req.json();

    // Check if staff exists
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("id", id)
      .eq("user_category", "staff")
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const { error: profileError } = await admin.from("profiles").update({
      full_name: body.full_name,
      email: body.email,
      phone: body.phone || null,
      campus_id: body.campus_id || null,
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (profileError) {
      console.error("[staff PUT] Profile update error:", profileError.message);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    const { error: staffError } = await admin.from("staff").update({
      department: body.department || "General",
      designation: body.designation || "Staff",
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (staffError) {
      console.error("[staff PUT] Staff record update error:", staffError.message);
    }

    if (body.permissionIds && Array.isArray(body.permissionIds)) {
      const validPermIds = body.permissionIds.filter((pid: unknown): pid is string => typeof pid === "string");
      if (validPermIds.length > 0) {
        await grantPermissions(id, validPermIds, session.userId);
      }
    }

    await logAudit({
      user_id: session.userId,
      action: "STAFF_UPDATED",
      table_name: "staff",
      record_id: id,
      new_data: body,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, message: "Staff updated successfully" });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[staff PUT] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "staff.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Staff ID required" }, { status: 400 });
    }

    const body = await req.json();

    // Check if staff exists
    const { data: existing } = await admin
      .from("profiles")
      .select("id, full_name, is_active")
      .eq("id", id)
      .eq("user_category", "staff")
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (typeof body.is_active === "boolean") {
      const { error } = await admin.from("profiles").update({
        is_active: body.is_active,
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      if (error) {
        console.error("[staff PATCH] Status toggle error:", error.message);
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
      }

      // Also update staff table status
      await admin.from("staff").update({
        status: body.is_active ? "active" : "inactive",
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      await logAudit({
        user_id: session.userId,
        action: body.is_active ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED",
        table_name: "staff",
        record_id: id,
        ip_address: getClientIP(req),
      });

      return NextResponse.json({
        success: true,
        is_active: body.is_active,
        message: body.is_active ? "Staff activated" : "Staff deactivated",
      });
    }

    return NextResponse.json({ error: "No valid patch field provided" }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[staff PATCH] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "staff.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Staff ID required" }, { status: 400 });
    }

    // Check if staff exists
    const { data: existing } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("id", id)
      .eq("user_category", "staff")
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Delete in proper order
    await admin.from("staff_permissions").delete().eq("profile_id", id);
    await admin.from("staff").delete().eq("id", id);
    await admin.from("profiles").delete().eq("id", id);
    await admin.auth.admin.deleteUser(id);

    await logAudit({
      user_id: session.userId,
      action: "STAFF_DELETED",
      table_name: "staff",
      record_id: id,
      old_data: existing,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, message: "Staff member deleted successfully" });
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 403 });
    }
    console.error("[staff DELETE] Unhandled error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
