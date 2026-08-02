import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();

    // 1. Check if any super_admin already exists
    const { data: existing, error: countError } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "super_admin")
      .limit(1);

    if (countError) {
      console.error("[setup-super-admin] Count query failed:", countError);
      return NextResponse.json(
        { error: "Database query failed", details: countError.message, hint: countError.hint || null },
        { status: 500 }
      );
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Super admin already exists" },
        { status: 409 }
      );
    }

    // 2. Read env vars
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const fullName = process.env.SUPER_ADMIN_NAME;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        {
          error: "Missing environment variables",
          details: "SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, and SUPER_ADMIN_NAME must be set",
          missing: [
            !email && "SUPER_ADMIN_EMAIL",
            !password && "SUPER_ADMIN_PASSWORD",
            !fullName && "SUPER_ADMIN_NAME",
          ].filter(Boolean),
        },
        { status: 500 }
      );
    }

    // 3. Create super admin auth user
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "super_admin" },
    });

    if (authError || !authUser.user) {
      console.error("[setup-super-admin] Auth creation failed:", authError);
      return NextResponse.json(
        { error: "Auth creation failed", details: authError?.message || "Unknown auth error" },
        { status: 500 }
      );
    }

    // 4. Create profile
    const { error: profileError } = await admin.from("profiles").insert({
      id: authUser.user.id,
      email,
      full_name: fullName,
      role: "super_admin",
      password_changed: false,
      onboarding_completed: false,
      is_active: true,
    });

    if (profileError) {
      console.error("[setup-super-admin] Profile insert failed:", profileError);
      // Rollback auth user
      await admin.auth.admin.deleteUser(authUser.user.id).catch((e: any) => {
        console.error("[setup-super-admin] Rollback delete failed:", e);
      });
      return NextResponse.json(
        { error: "Profile creation failed", details: profileError.message, hint: profileError.hint || null },
        { status: 500 }
      );
    }

    // 5. Log audit
    await logAudit({
      user_id: authUser.user.id,
      action: "SUPER_ADMIN_CREATED",
      target_type: "profile",
      target_id: authUser.user.id,
      metadata: { method: "env_setup" },
      ip_address: req.headers.get("x-forwarded-for") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    }).catch((e: any) => {
      console.error("[setup-super-admin] Audit log failed (non-critical):", e);
    });

    return NextResponse.json({
      success: true,
      message: "Super admin created successfully. Please log in and change your password.",
      email,
    });
  } catch (error: any) {
    console.error("[setup-super-admin] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// Also support GET for quick health check
export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("profiles").select("count").limit(1);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: "Database connection working", profilesExist: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
