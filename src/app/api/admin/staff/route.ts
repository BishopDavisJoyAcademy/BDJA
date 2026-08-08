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

    // Validate required fields
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
