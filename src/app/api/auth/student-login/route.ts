import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-client";
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
    const { admission_number, pin } = body;

    if (!admission_number || !pin) {
      return NextResponse.json({ error: "Admission number and PIN are required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const ip = getClientIP(req);
    const ua = req.headers.get("user-agent") || "";

    interface StudentLoginRow {
      id: string;
      admission_number: string;
      profile_id: string;
      profiles: { id: string; email: string; is_active: boolean | null }[] | null;
    }

    const { data: studentRaw, error: studentError } = await admin
      .from("students")
      .select("id, admission_number, profile_id, profiles!inner(id, email, is_active)")
      .eq("admission_number", admission_number)
      .maybeSingle();
    const student = studentRaw as StudentLoginRow | null;

    if (studentError || !student) {
      await recordFailedLogin(null, admission_number, ip, ua);
      return NextResponse.json({ error: "Invalid admission number or PIN" }, { status: 401 });
    }

    const profile = student?.profiles?.[0] ?? null;
    const email = profile?.email;
    const userId = profile?.id;

    if (!email || !userId) {
      return NextResponse.json({ error: "Student account not properly configured" }, { status: 500 });
    }

    // CRITICAL FIX: Check is_active for students too
    if (profile.is_active === false) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const lockout = await checkAccountLockout(userId);
    if (lockout.isLocked) {
      return NextResponse.json({ error: lockout.message || "Account locked" }, { status: 403 });
    }

    // Build response for cookie writing
    let response = NextResponse.json({});
    const supabase = await createRouteHandlerClient(req, response);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: pin });

    if (authError || !authData.session) {
      await recordFailedLogin(userId, email, ip, ua);
      return NextResponse.json({ error: "Invalid admission number or PIN" }, { status: 401 });
    }

    await recordSuccessfulLogin(userId, email, ip, ua);

    const expiresAt = new Date(Date.now() + 10 * 60 * 60 * 1000);
    await recordSession(userId, authData.session.access_token, ip, extractDeviceInfo(req).user_agent, expiresAt);

    return NextResponse.json({
      success: true,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
      user: { id: userId, email },
    }, {
      status: 200,
      headers: response.headers,
    });
  } catch (error: any) {
    console.error("[student-login] Error:", error);
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 });
  }
}
