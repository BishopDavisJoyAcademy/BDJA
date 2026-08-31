import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { getClientIP, checkAccountLockout, recordFailedLogin, recordSuccessfulLogin } from "@/lib/security";
import { getErrorMessage } from "@/lib/errors";
import { restoreMissingProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const ip = getClientIP(req);

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Check lockout
    const lockout = await checkAccountLockout(email);
    if (lockout.locked) {
      return NextResponse.json(
        { error: `Account locked. Try again after ${new Date(lockout.lockedUntil!).toLocaleTimeString()}.` },
        { status: 423 }
      );
    }

    // Authenticate
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: true, persistSession: true },
    });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      await recordFailedLogin(email, ip, req.headers.get("user-agent") || "");
      return NextResponse.json(
        { error: authError?.message || "Invalid email or password" },
        { status: 401 }
      );
    }

    const userId = authData.user.id;
    const admin = getSupabaseAdmin();

    // Fetch profile with last_password_change for debugging
    let { data: profileRows } = await admin
      .from("profiles")
      .select("is_active, password_changed, onboarding_completed, user_category, last_password_change, role, full_name")
      .eq("id", userId)
      .limit(1);

    let profile = (profileRows?.[0] ?? null) as {
      is_active: boolean;
      password_changed: boolean;
      onboarding_completed: boolean;
      user_category: string;
      last_password_change: string | null;
      role: string;
      full_name: string;
    } | null;

    if (!profile) {
      const restored = await restoreMissingProfile(userId);
      if (restored) {
        const { data: restoredRows } = await admin
          .from("profiles")
          .select("is_active, password_changed, onboarding_completed, user_category, last_password_change, role, full_name")
          .eq("id", userId)
          .limit(1);
        profile = (restoredRows?.[0] ?? null) as typeof profile;
      }
    }

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    if (!profile.is_active) {
      return NextResponse.json({ error: "Account is inactive. Contact administrator." }, { status: 403 });
    }

    // Defensive: log warning if password_changed is false but last_password_change is very recent
    if (profile.password_changed === false && profile.last_password_change) {
      const lastChange = new Date(profile.last_password_change);
      const now = new Date();
      const secondsSinceChange = Math.floor((now.getTime() - lastChange.getTime()) / 1000);
      if (secondsSinceChange < 300) {
        console.warn(
          `[login] DIAGNOSTIC: User ${userId} has password_changed=false but last_password_change was ` +
          `${secondsSinceChange}s ago. Possible race condition or stale read.`
        );
      }
    }

    // Reset failed attempts
    await recordSuccessfulLogin(email, ip);

    // Update last login
    await admin.from("profiles").update({
      last_login_at: new Date().toISOString(),
      last_login_ip: ip,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);

    await logAudit({
      user_id: userId,
      action: "LOGIN",
      table_name: "profiles",
      record_id: userId,
      ip_address: ip,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        expires_at: authData.session?.expires_at,
        expires_in: authData.session?.expires_in,
      },
      user: {
        id: userId,
        email: authData.user.email,
        full_name: profile.full_name,
        role: profile.role,
        user_category: profile.user_category,
        password_changed: profile.password_changed,
        last_password_change: profile.last_password_change,
        onboarding_completed: profile.onboarding_completed,
      },
    });
  } catch (error: unknown) {
    console.error("[login] Unhandled error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Login failed" },
      { status: 500 }
    );
  }
}
