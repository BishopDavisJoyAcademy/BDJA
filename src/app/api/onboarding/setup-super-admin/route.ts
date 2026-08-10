import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, full_name, password } = body;

    if (!email || !full_name || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: existingAdmin } = await admin
      .from("profiles")
      .select("id")
      .eq("user_category", "admin")
      .limit(1)
      .single();

    if (existingAdmin) {
      return NextResponse.json({ error: "An admin already exists" }, { status: 403 });
    }

    const result = await createStaff({
      email,
      fullName: full_name,
      department: "Administration",
      designation: "Super Administrator",
      permissionIds: [],
      createdBy: "system",
    });

    // Upgrade to admin and set password
    await admin
      .from("profiles")
      .update({ role: "admin", user_category: "admin", password_changed: true, onboarding_completed: true } as any)
      .eq("id", result.staffId);

    await admin.auth.admin.updateUserById(result.staffId, { password });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[api/onboarding/setup-super-admin] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to setup super admin" }, { status: 500 });
  }
}
