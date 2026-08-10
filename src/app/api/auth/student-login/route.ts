import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { recordFailedLogin, recordSuccessfulLogin, checkAccountLockout, getClientIP, recordSession } from "@/lib/security";
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
    const { admission_number, pin } = body;

    if (!admission_number || !pin) {
      return NextResponse.json({ error: "Admission number and PIN are required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const ip = getClientIP(req);
    const ua = req.headers.get("user-agent") || "";

    const { data: student, error: studentError } = await admin
      .from("students")
      .select("id, admission_number, profiles!inner(id, email)")
      .eq("admission_number", admission_number)
      .single();

    if (studentError || !student) {
      await recordFailedLogin(null, admission_number, ip, ua);
      return NextResponse.json({ error: "Invalid admission number or PIN" }, { status: 401 });
    }

    const profile = (student as any).profiles;
    const email = profile?.email;
    const userId = profile?.id;

    if (!email || !userId) {
      return NextResponse.json({ error: "Student account not properly configured" }, { status: 500 });
    }

    const lockout = await checkAccountLockout(userId);
    if (lockout.isLocked) {
      return NextResponse.json({ error: lockout.message || "Account locked" }, { status: 403 });
    }

    const { data: authData, error: authError } = await admin.auth.signInWithPassword({ email, password: pin });

    if (authError || !authData.session) {
      await recordFailedLogin(userId, email, ip, ua);
      return NextResponse.json({ error: "Invalid admission number or PIN" }, { status: 401 });
    }

    await recordSuccessfulLogin(userId, email, ip, ua);

    const expiresAt = new Date(Date.now() + 10 * 60 * 60 * 1000);
    await recordSession(userId, authData.session.access_token, ip, ua, expiresAt);

    return NextResponse.json({
      user: {
        id: userId,
        email,
        role: "student",
        password_changed: true,
        onboarding_completed: true,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
    });
  } catch (error: any) {
    console.error("[student-login] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
