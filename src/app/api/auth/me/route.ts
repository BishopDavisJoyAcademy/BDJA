import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await validateSession(req);
    if (error || !session) {
      return NextResponse.json({ error: error?.message || "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Get user permissions
    const { data: perms } = await admin
      .rpc("get_user_permissions", { p_user_id: session.userId });

    // Get staff/student specific data
    const { data: staffData } = await admin
      .from("staff")
      .select("department, designation")
      .eq("id", session.userId)
      .single();

    const { data: studentData } = await admin
      .from("students")
      .select("admission_number, grade_level")
      .eq("id", session.userId)
      .single();

    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
        user_category: session.userCategory,
        full_name: session.fullName,
        campus_id: session.campusId,
        password_changed: session.passwordChanged,
        onboarding_completed: session.onboardingCompleted,
        is_active: session.isActive,
      },
      profile: {
        id: session.userId,
        email: session.email,
        role: session.role,
        user_category: session.userCategory,
        full_name: session.fullName,
        campus_id: session.campusId,
        password_changed: session.passwordChanged,
        onboarding_completed: session.onboardingCompleted,
        is_active: session.isActive,
        department: staffData?.department || null,
        designation: staffData?.designation || null,
        admission_number: studentData?.admission_number || null,
        grade_level: studentData?.grade_level || null,
      },
      permissions: perms?.map((p: any) => p.permission_key) || [],
    });
  } catch (error: any) {
    console.error("[api/auth/me] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
