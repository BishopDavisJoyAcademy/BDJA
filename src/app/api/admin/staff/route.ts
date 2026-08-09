import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createStaff } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("user_category").eq("id", user.id).single();
    if (!profile || (profile.user_category !== "admin" && !(await hasPermission(user.id, "staff.manage")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      // Single staff member
      const { data: staff, error } = await admin
        .from("profiles")
        .select("*, staff(*)")
        .eq("id", id)
        .single();
      if (error) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      return NextResponse.json({ staff });
    }

    // All staff
    const { data: staff, error } = await admin
      .from("profiles")
      .select("*, staff(*)")
      .eq("user_category", "staff")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
    return NextResponse.json({ staff: staff || [] });
  } catch (error: any) {
    console.error("[staff GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("user_category").eq("id", user.id).single();
    if (!profile || (profile.user_category !== "admin" && !(await hasPermission(user.id, "staff.manage")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
      createdBy: user.id,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[staff POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create staff" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("user_category").eq("id", user.id).single();
    if (!profile || (profile.user_category !== "admin" && !(await hasPermission(user.id, "staff.manage")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Staff ID required" }, { status: 400 });

    const body = await req.json();

    // Update profile
    const { error: profileError } = await admin.from("profiles").update({
      full_name: body.full_name,
      email: body.email,
      phone: body.phone,
      campus_id: body.campus_id || null,
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (profileError) {
      console.error("[staff PUT] profile update error:", profileError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // Update staff record
    const { error: staffError } = await admin.from("staff").update({
      department: body.department || "General",
      designation: body.designation || "Staff",
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (staffError) {
      console.error("[staff PUT] staff update error:", staffError);
    }

    // Update permissions: delete old, insert new
    if (body.permissionIds) {
      await admin.from("staff_permissions").delete().eq("profile_id", id);
      if (body.permissionIds.length > 0) {
        const permRecords = body.permissionIds.map((pid: string) => ({
          profile_id: id,
          permission_id: pid,
        }));
        const { error: permError } = await admin.from("staff_permissions").insert(permRecords);
        if (permError) console.error("[staff PUT] permission update error:", permError);
      }
    }

    return NextResponse.json({ success: true, message: "Staff updated" });
  } catch (error: any) {
    console.error("[staff PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update staff" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("user_category").eq("id", user.id).single();
    if (!profile || (profile.user_category !== "admin" && !(await hasPermission(user.id, "staff.manage")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Staff ID required" }, { status: 400 });

    const body = await req.json();
    const { error } = await admin.from("profiles").update({
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[staff PATCH] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
