import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getUserPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("*, staff(department, designation), students(admission_number, grade_level)")
      .eq("id", session.userId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
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
        is_active: profile.is_active,
        password_changed: profile.password_changed,
        onboarding_completed: profile.onboarding_completed,
        department: profile.staff?.department || null,
        designation: profile.staff?.designation || null,
        admission_number: profile.students?.admission_number || null,
        grade_level: profile.students?.grade_level || null,
      },
      permissions,
    });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[api/auth/me] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
