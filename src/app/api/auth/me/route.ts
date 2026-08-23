import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getUserPermissions } from "@/lib/permissions";
import { getErrorMessage, isAuthError } from "@/lib/errors";

/**
 * Type-safe runtime check for account suspension.
 * Supabase generated types may narrow `is_active` to `true | null`,
 * but the database column is `boolean | null`. We accept `unknown`
 * and use strict equality to safely detect explicit `false`.
 */
function isAccountSuspended(value: unknown): value is false {
  return value === false;
}

export const dynamic = "force-dynamic";

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
      is_active: boolean | null;
      password_changed: boolean;
      onboarding_completed: boolean;
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

    // Only explicit false means inactive. NULL/true = active.
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
        department: profile.staff?.[0]?.department || null,
        designation: profile.staff?.[0]?.designation || null,
        admission_number: profile.students?.[0]?.admission_number || null,
        grade_level: profile.students?.[0]?.grade_level || null,
      },
      permissions,
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: error.statusCode || 401 });
    }
    console.error("[api/auth/me] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
