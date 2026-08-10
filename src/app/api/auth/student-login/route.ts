import { NextRequest, NextResponse } from "next/server";
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

    // Look up student by admission number
    interface StudentLoginRow {
      id: string;
      admission_number: string;
      profile_id: string;
      profiles: { id: string; email: string }[] | null;
    }

    const { data: studentRaw, error: studentError } = await admin
      .from("students")
      .select("id, admission_number, profile_id, profiles!inner(id, email)")
      .eq("admission_number", admission_number)
      .maybeSingle();
    const student = studentRaw as StudentLoginRow | null;

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

    // Check lockout
    const lockout = await checkAccountLockout(userId);
    if (lockout.isLocked) {
      return NextResponse.json({ error: lockout.message || "Account locked" }, { status: 403 });
    }

    // Sign in with email + PIN
    const { data: authData, error: authError } = await admin.auth.signInWithPassword({ email, password: pin });

    if (authError || !authData.session) {
      await recordFailedLogin(userId, email, ip, ua);
      return NextResponse.json({ error: "Invalid admission number or PIN" }, { status: 401 });
    }

    await recordSuccessfulLogin(userId, email, ip, ua);

    const expiresAt = new Date(Date.now() + 10 * 60 * 60 * 1000);
    await recordSession(userId, authData.session.access_token, extractDeviceInfo(req), ip, expiresAt);

    return NextResponse.json({
      success: true,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
      user: { id: userId, email },
    });
  } catch (error: any) {
    console.error("[student-login] Error:", error);
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 });
  }
}
