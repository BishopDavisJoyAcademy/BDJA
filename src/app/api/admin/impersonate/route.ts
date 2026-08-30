import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logImpersonation } from "@/lib/audit";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, isAuthError } from "@/lib/errors";

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  user_category: string;
  campus_id: string | null;
  is_active: boolean;
}

interface StaffRow {
  department: string | null;
  designation: string | null;
}

interface StudentRow {
  admission_number: string | null;
  grade_level: string | null;
}

interface SessionInsert {
  user_id: string;
  session_token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  expires_at: string;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "impersonate.users");

    const identifier = getClientIP(req) + ":impersonate";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.impersonate);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many impersonation attempts" }, { status: 429 });
    }

    const admin = getSupabaseAdmin();
    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
    }

    const { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name, role, user_category, campus_id, is_active")
      .eq("id", targetUserId)
      .limit(1);
    const profileRaw = (profileRows?.[0] ?? null) as ProfileRow | null;

    if (profileError || !profileRaw) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    const profile = profileRaw

    if (profile.user_category === "admin" && targetUserId !== session.userId) {
      return NextResponse.json({ error: "Cannot impersonate other admins" }, { status: 403 });
    }

    const { data: staffRows } = await admin
      .from("staff")
      .select("department, designation")
      .eq("id", targetUserId)
      .limit(1);
    const staffRaw = (staffRows?.[0] ?? null) as StaffRow | null;

    const staff = staffRaw

    const { data: studentRows } = await admin
      .from("students")
      .select("admission_number, grade_level")
      .eq("id", targetUserId)
      .limit(1);
    const studentRaw = (studentRows?.[0] ?? null) as StudentRow | null;

    const student = studentRaw

    const viewToken = require("crypto").randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const sessionPayload: SessionInsert = {
      user_id: session.userId,
      session_token_hash: viewToken,
      ip_address: getClientIP(req),
      user_agent: req.headers.get("user-agent") || null,
      is_active: true,
      expires_at: expiresAt,
    };

    await getSupabaseAdmin().from("user_sessions").insert(sessionPayload);

    await logImpersonation(session.userId, targetUserId, "start", getClientIP(req), req.headers.get("user-agent") || undefined);

    return NextResponse.json({
      viewToken,
      expiresAt,
      targetUser: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        user_category: profile.user_category,
        campus_id: profile.campus_id,
        department: staff?.department || null,
        designation: staff?.designation || null,
        admission_number: student?.admission_number || null,
        grade_level: student?.grade_level || null,
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    console.error("[impersonate POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requirePermission(session, "impersonate.users");

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    let dbQuery = admin
      .from("profiles")
      .select("id, email, full_name, user_category, is_active")
      .neq("user_category", "admin")
      .limit(20);

    if (query) {
      const safeQuery = query.replace(/[%_]/g, "\$&");
      dbQuery = dbQuery.or(`full_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`);
    }

    const { data: users, error } = await dbQuery;
    if (error) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    return NextResponse.json({ users: (users) || [] });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    console.error("[impersonate GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
