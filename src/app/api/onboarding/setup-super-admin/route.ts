import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    // Check if any super_admin already exists
    const { data: existing, error: countError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "super_admin")
      .limit(1);

    if (countError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Super admin already exists" }, { status: 409 });
    }

    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const fullName = process.env.SUPER_ADMIN_NAME;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, and SUPER_ADMIN_NAME must be set in environment" },
        { status: 500 }
      );
    }

    // Create super admin auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "super_admin" },
    });

    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create super admin" },
        { status: 500 }
      );
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authUser.user.id,
      email,
      full_name: fullName,
      role: "super_admin",
      password_changed: false,
      onboarding_completed: false,
      is_active: true,
    });

    if (profileError) {
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    await logAudit({
      user_id: authUser.user.id,
      action: "SUPER_ADMIN_CREATED",
      target_type: "profile",
      target_id: authUser.user.id,
      metadata: { method: "env_setup" },
      ip_address: req.headers.get("x-forwarded-for") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Super admin created successfully. Please log in and change your password.",
      email,
    });
  } catch (error: any) {
    console.error("Setup super admin error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
