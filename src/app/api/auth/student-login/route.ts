import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { recordFailedLogin, recordSuccessfulLogin, checkAccountLockout, extractDeviceInfo, getClientIP, recordSession } from "@/lib/security";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const identifier = getClientIP(req) + ":student-login";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.login);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    const body = await req.json();
    const { admission_number, password } = body;

    if (!admission_number || !password) {
      return NextResponse.json({ error: "Admission number and PIN are required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const ip = getClientIP(req);
    const deviceInfo = extractDeviceInfo(req);
    const userAgent = req.headers.get("user-agent") || "";

    // Look up student by admission number
    const { data: studentRows, error: studentError } = await admin
      .from("students")
      .select("id, admission_number, profile_id")
      .eq("admission_number", admission_number)
      .limit(1);

    if (studentError || !studentRows || studentRows.length === 0) {
      await recordFailedLogin(null, admission_number, ip, userAgent);
      return NextResponse.json({ error: "Invalid admission number or PIN" }, { status: 401 });
    }

    const student = studentRows[0];
    const studentId = student.profile_id || student.id;

    // Check lockout
    const lockout = await checkAccountLockout(studentId);
    if (lockout.isLocked) {
      return NextResponse.json({ error: lockout.message || "Account locked" }, { status: 403 });
    }

    // Get auth user email (internal email for Supabase Auth)
    const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(studentId);
    if (authUserError || !authUserData?.user?.email) {
      console.error("[student-login] Failed to get auth user email:", authUserError?.message);
      return NextResponse.json({ error: "Account authentication error" }, { status: 500 });
    }

    const authEmail = authUserData.user.email;

    // Authenticate using the internal auth email
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      await recordFailedLogin(studentId, admission_number, ip, userAgent);
      return NextResponse.json({ error: "Invalid admission number or PIN" }, { status: 401 });
    }

    // Check profile
    let { data: profileRows } = await admin
      .from("profiles")
      .select("is_active, password_changed, onboarding_completed, user_category, role, full_name")
      .eq("id", studentId)
      .limit(1);

    let profile = (profileRows?.[0] ?? null) as {
      is_active: boolean | null;
      password_changed: boolean;
      onboarding_completed: boolean;
      user_category: string;
      role: string | null;
      full_name: string | null;
    } | null;

    if (!profile) {
      const { restoreMissingProfile } = await import("@/lib/auth");
      const restored = await restoreMissingProfile(studentId);
      if (restored) {
        const { data: restoredRows } = await admin
          .from("profiles")
          .select("is_active, password_changed, onboarding_completed, user_category, role, full_name")
          .eq("id", studentId)
          .limit(1);
        profile = (restoredRows?.[0] ?? null) as typeof profile;
      }
      if (!profile) {
        await recordFailedLogin(studentId, admission_number, ip, userAgent);
        return NextResponse.json({ error: "Account profile missing" }, { status: 500 });
      }
    }

    if (profile.is_active === false) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    await recordSuccessfulLogin(studentId, admission_number, ip, userAgent);

    // Record session
    const expiresAt = new Date(Date.now() + 10 * 60 * 60 * 1000);
    await recordSession(studentId, authData.session.access_token, ip, deviceInfo.user_agent, expiresAt);

    return NextResponse.json({
      success: true,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
      user: {
        id: studentId,
        email: authEmail,
        full_name: profile.full_name,
        role: profile.role,
        user_category: profile.user_category,
        password_changed: profile.password_changed,
        onboarding_completed: profile.onboarding_completed,
      },
    });
  } catch (error: unknown) {
    console.error("[api/auth/student-login] Error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
