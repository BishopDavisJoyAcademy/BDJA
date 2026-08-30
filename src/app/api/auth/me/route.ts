import { NextRequest, NextResponse } from "next/server";
import { requireAuth, validateSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getUserPermissions } from "@/lib/permissions";
import { getErrorMessage, isAuthError } from "@/lib/errors";
import { createClient } from "@/lib/supabase-client";

function isAccountSuspended(value: unknown): value is false {
  return value === false;
}

export const dynamic = "force-dynamic";

/* ─── GET: Return current user profile ─── */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    interface MeProfileRow {
      id: string;
      email: string;
      full_name: string;
      role: string;
      user_category: string;
      campus_id: string | null;
      is_active: boolean;
      password_changed: boolean;
      onboarding_completed: boolean;
      avatar_url: string | null;
      phone: string | null;
      staff: { department: string | null; designation: string | null }[] | null;
      students: { admission_number: string | null; grade_level: string | null }[] | null;
    }

    const { data: profileRaw, error: profileError } = await admin
      .from("profiles")
      .select("*, staff(department, designation), students(admission_number, grade_level)")
      .eq("id", session.userId)
      .maybeSingle();
    const profile = profileRaw as MeProfileRow | null;

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (isAccountSuspended(profile.is_active)) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const permissions = await getUserPermissions(session.userId);

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        user_category: profile.user_category,
        campus_id: profile.campus_id,
        is_active: !isAccountSuspended(profile.is_active),
        password_changed: profile.password_changed,
        onboarding_completed: profile.onboarding_completed,
        avatar_url: profile.avatar_url,
        phone: profile.phone,
        department: profile.staff?.[0]?.department || null,
        designation: profile.staff?.[0]?.designation || null,
        admission_number: profile.students?.[0]?.admission_number || null,
        grade_level: profile.students?.[0]?.grade_level || null,
      },
      permissions,
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: (error as { statusCode?: number }).statusCode || 401 });
    }
    console.error("[api/auth/me GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ─── PATCH: Update user profile ─── */
export async function PATCH(req: NextRequest) {
  try {
    // Dual auth: try header first, fall back to cookies
    let userId: string | null = null;

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (token) {
      const { session, error } = await validateSession(token);
      if (session && !error) userId = session.userId;
    }

    if (!userId) {
      try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) userId = user.id;
      } catch {
        // cookie auth failed
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const admin = getSupabaseAdmin();

    // Only fields that ACTUALLY exist in the profiles table
    const updates: {
      full_name?: string;
      phone?: string | null;
      avatar_url?: string | null;
      updated_at?: string;
    } = {};

    if (typeof body.full_name === "string") updates.full_name = body.full_name;
    if (body.phone === null || typeof body.phone === "string") updates.phone = body.phone;
    if (body.avatar_url === null || typeof body.avatar_url === "string") updates.avatar_url = body.avatar_url;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { error: updateError } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (updateError) {
      console.error("[api/auth/me PATCH] Update failed:", updateError);
      return NextResponse.json(
        { error: `Update failed: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, updated: Object.keys(updates) });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[api/auth/me PATCH] Error:", err);
    return NextResponse.json(
      { error: `Update failed: ${err.message}` },
      { status: 500 }
    );
  }
}
