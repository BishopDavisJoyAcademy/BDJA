import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logImpersonation } from "@/lib/audit";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIP } from "@/lib/security";

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

    const { data: targetProfile, error: targetError } = await admin
      .from("profiles")
      .select("*, staff(department, designation), students(admission_number, grade_level)")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    if (targetProfile.user_category === "admin" && targetUserId !== session.userId) {
      return NextResponse.json({ error: "Cannot impersonate other admins" }, { status: 403 });
    }

    const viewToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await admin.from("user_sessions").insert({
      user_id: session.userId,
      session_token_hash: viewToken,
      ip_address: getClientIP(req),
      user_agent: req.headers.get("user-agent") || null,
      is_active: true,
      expires_at: expiresAt,
    });

    await logImpersonation(session.userId, targetUserId, "start", getClientIP(req), req.headers.get("user-agent") || undefined);

    return NextResponse.json({
      viewToken,
      expiresAt,
      targetUser: {
        id: targetProfile.id,
        email: targetProfile.email,
        full_name: targetProfile.full_name,
        role: targetProfile.role,
        user_category: targetProfile.user_category,
        campus_id: targetProfile.campus_id,
        department: targetProfile.staff?.department || null,
        designation: targetProfile.staff?.designation || null,
        admission_number: targetProfile.students?.admission_number || null,
        grade_level: targetProfile.students?.grade_level || null,
      },
    });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
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

    return NextResponse.json({ users: users || [] });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[impersonate GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
