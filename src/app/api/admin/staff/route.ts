import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { createStaff, createUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { grantPermissions, revokeAllPermissions } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await validateSession(req);
    if (error || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data, error: dbError } = await admin
      .from("profiles")
      .select("*, staff(*), staff_permissions(permission:permissions(key, name, category))")
      .eq("user_category", "staff")
      .order("created_at", { ascending: false });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ staff: data || [] });
  } catch (error: any) {
    console.error("[api/admin/staff] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await validateSession(req);
    if (error || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as Record<string, any>;
    const { email, fullName, phone, department, designation, campusId, permissionIds } = body;

    if (!email || !fullName) {
      return NextResponse.json({ error: "Email and full name are required" }, { status: 400 });
    }

    const result = await createStaff({
      email,
      fullName,
      phone,
      department: department || "General",
      designation: designation || "Staff",
      campusId,
      permissionIds: permissionIds || [],
      createdBy: session.userId,
    });

    await logAudit({
      user_id: session.userId,
      action: "STAFF_CREATED",
      target_type: "staff",
      target_id: result.userId,
      metadata: { email, fullName, department, designation },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      staff: {
        id: result.userId,
        email: result.email,
        full_name: fullName,
        temp_password: result.tempPassword,
      },
    });
  } catch (error: any) {
    console.error("[api/admin/staff] POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create staff" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { session, error } = await validateSession(req);
    if (error || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    await revokeAllPermissions(id);
    await admin.from("staff").delete().eq("id", id);
    await admin.from("profiles").delete().eq("id", id);
    await admin.auth.admin.deleteUser(id).catch(() => {});

    await logAudit({
      user_id: session.userId,
      action: "STAFF_DELETED",
      target_type: "staff",
      target_id: id,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api/admin/staff] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
