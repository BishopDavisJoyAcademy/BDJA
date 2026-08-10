import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";
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
    const ip = getClientIP(req);
    const deviceInfo = extractDeviceInfo(req);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user || !authData.session) {
      await recordFailedLogin(null, email, ip, req.headers.get("user-agent") || "");
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const userId = authData.user.id;

    const lockout = await checkAccountLockout(userId);
    if (lockout.isLocked) {
      return NextResponse.json({ error: lockout.message || "Account locked" }, { status: 403 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active, password_changed, onboarding_completed, user_category")
      .eq("id", userId)
      .single();

    if (!profile) {
      await recordFailedLogin(userId, email, ip, req.headers.get("user-agent") || "");
      return NextResponse.json({ error: "Account profile missing" }, { status: 500 });
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    await recordSuccessfulLogin(userId, email, ip, req.headers.get("user-agent") || "");

    const expiresAt = new Date(Date.now() + 10 * 60 * 60 * 1000);
    await recordSession(userId, authData.session.access_token, ip, req.headers.get("user-agent") || "", expiresAt);

    return NextResponse.json({
      user: {
        id: userId,
        email: authData.user.email,
        role: profile.user_category,
        password_changed: profile.password_changed,
        onboarding_completed: profile.onboarding_completed,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
    });
  } catch (error: any) {
    console.error("[login] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
