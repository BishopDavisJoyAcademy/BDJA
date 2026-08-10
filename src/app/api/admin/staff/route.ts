import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createStaff } from "@/lib/auth";
import { grantPermissions } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "staff.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      interface StaffDetailRow {
        id: string;
        email: string;
        full_name: string;
        role: string;
        user_category: string;
        campus_id: string | null;
        is_active: boolean;
        staff: { department: string | null; designation: string | null; [key: string]: any }[] | null;
        [key: string]: any;
      }

      const { data: staffRaw, error } = await admin
        .from("profiles")
        .select("*, staff(*)")
        .eq("id", id)
        .eq("user_category", "staff")
        .maybeSingle();
      const staff = staffRaw as StaffDetailRow | null;
      if (error) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      return NextResponse.json({ staff });
    }

    const { data: staff, error } = await admin
      .from("profiles")
      .select("*, staff(*)")
      .eq("user_category", "staff")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
    return NextResponse.json({ staff: staff || [] });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[staff GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "staff.manage");

    const body = await req.json();
    if (!body.email || !body.full_name) {
      return NextResponse.json({ error: "Email and full name are required" }, { status: 400 });
    }

    const result = await createStaff({
      email: body.email,
      fullName: body.full_name,
      phone: body.phone,
      department: body.department,
      designation: body.designation,
      campusId: body.campus_id,
      permissionIds: body.permissionIds || [],
      createdBy: session.userId,
    });

    await logAudit({
      user_id: session.userId,
      action: "STAFF_CREATED",
      table_name: "staff",
      record_id: result.userId,
      metadata: { email: body.email, department: body.department },
      ip_address: getClientIP(req),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[staff POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create staff" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "staff.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Staff ID required" }, { status: 400 });

    const body = await req.json();

    const { error: profileError } = await admin.from("profiles").update({
      full_name: body.full_name,
      email: body.email,
      phone: body.phone,
      campus_id: body.campus_id || null,
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (profileError) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    await admin.from("staff").update({
      department: body.department || "General",
      designation: body.designation || "Staff",
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (body.permissionIds) {
      await grantPermissions(id, body.permissionIds, session.userId);
    }

    await logAudit({
      user_id: session.userId,
      action: "STAFF_UPDATED",
      table_name: "staff",
      record_id: id,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true, message: "Staff updated" });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[staff PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update staff" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "staff.manage");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Staff ID required" }, { status: 400 });

    const body = await req.json();
    const { error } = await admin.from("profiles").update({
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

    await logAudit({
      user_id: session.userId,
      action: body.is_active ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED",
      table_name: "staff",
      record_id: id,
      ip_address: getClientIP(req),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[staff PATCH] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
