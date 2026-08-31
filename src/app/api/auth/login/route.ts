import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { recordFailedLogin, recordSuccessfulLogin, checkAccountLockout, extractDeviceInfo, getClientIP, recordSession } from "@/lib/security";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const identifier = getClientIP(req) + ":login";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.login);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const admin = getSupabaseAdmin();
    const ip = getClientIP(req);
    const deviceInfo = extractDeviceInfo(req);
    const userAgent = req.headers.get("user-agent") || "";

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user || !authData.session) {
      await recordFailedLogin(null, email, ip, userAgent);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const userId = authData.user.id;

    // Check lockout
    const lockout = await checkAccountLockout(userId);
    if (lockout.isLocked) {
      return NextResponse.json({ error: lockout.message || "Account locked" }, { status: 403 });
    }

    // Check profile — use admin client to bypass RLS (session cookies not set yet)
    let { data: profileRows } = await admin
      .from("profiles")
      .select("is_active, password_changed, onboarding_completed, user_category, last_password_change, role, full_name")
      .eq("id", userId)
      .limit(1);

    let profile = (profileRows?.[0] ?? null) as {
      is_active: boolean | null;
      password_changed: boolean;
      onboarding_completed: boolean;
      user_category: string;
      last_password_change: string | null;
      role: string | null;
      full_name: string | null;
    } | null;

    if (!profile) {
      // Auto-restore missing profile
      const { restoreMissingProfile } = await import("@/lib/auth");
      const restored = await restoreMissingProfile(userId);
      if (restored) {
        const { data: restoredRows } = await admin
          .from("profiles")
          .select("is_active, password_changed, onboarding_completed, user_category, last_password_change, role, full_name")
          .eq("id", userId)
          .limit(1);
        profile = (restoredRows?.[0] ?? null) as typeof profile;
      }
      if (!profile) {
        await recordFailedLogin(userId, email, ip, userAgent);
        return NextResponse.json({ error: "Account profile missing" }, { status: 500 });
      }
    }

    // CRITICAL FIX: Only explicit false means inactive
    if (profile.is_active === false) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    // DIAGNOSTIC: warn if password_changed is false but last_password_change is very recent
    // This catches the race condition / stale read that causes the password-change loop
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

    await recordSuccessfulLogin(userId, email, ip, userAgent);

    // Record session server-side
    const expiresAt = new Date(Date.now() + 10 * 60 * 60 * 1000); // 10 hours
    await recordSession(userId, authData.session.access_token, ip, deviceInfo.user_agent, expiresAt);

    return NextResponse.json({
      success: true,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
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
    console.error("[api/auth/login] Error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
