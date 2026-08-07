import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { hasPermission } from "@/lib/permissions";
import { logImpersonation } from "@/lib/audit";
import { rateLimit, RATE_LIMITS, getClientIdentifier } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const identifier = getClientIdentifier(req) + ":impersonate";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.impersonate);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many impersonation attempts" }, { status: 429 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user: adminUser }, error: authError } = await admin.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: adminProfile } = await admin
      .from("profiles")
      .select("user_category")
      .eq("id", adminUser.id)
      .single();

    if (!adminProfile || adminProfile.user_category !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    if (!(await hasPermission(adminUser.id, "impersonate.users"))) {
      return NextResponse.json({ error: "Forbidden - Missing impersonate permission" }, { status: 403 });
    }

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

    if (targetProfile.user_category === "admin" && targetUserId !== adminUser.id) {
      return NextResponse.json({ error: "Cannot impersonate other admins" }, { status: 403 });
    }

    const viewToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await admin.from("user_sessions").insert({
      user_id: adminUser.id,
      session_token_hash: viewToken,
      ip_address: getClientIp(req),
      user_agent: req.headers.get("user-agent") || null,
      is_active: true,
      expires_at: expiresAt,
    });

    await logImpersonation(
      adminUser.id, targetUserId, "start",
      getClientIp(req), req.headers.get("user-agent") || undefined
    );

    return NextResponse.json({
      viewToken, expiresAt,
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
    console.error("[api/admin/impersonate] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user: adminUser }, error: authError } = await admin.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: adminProfile } = await admin
      .from("profiles")
      .select("user_category")
      .eq("id", adminUser.id)
      .single();

    if (!adminProfile || adminProfile.user_category !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    let dbQuery = admin
      .from("profiles")
      .select("id, email, full_name, user_category, is_active")
      .neq("user_category", "admin")
      .limit(20);

    if (query) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
    }

    const { data: users, error } = await dbQuery;
    if (error) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error: any) {
    console.error("[api/admin/impersonate] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
