import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

// GET — fetch current user's profile
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    // Fetch from profiles + related tables
    const { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, role, user_category, campus_id, department, designation")
      .eq("id", session.userId)
      .limit(1);

    if (profileError || !profileRows || profileRows.length === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profile = profileRows[0];

    // Fetch student-specific data if applicable
    let admission_number = null;
    let grade_level = null;
    if (profile.user_category === "student") {
      const { data: studentRows } = await admin
        .from("students")
        .select("admission_number, grade_level")
        .eq("profile_id", session.userId)
        .limit(1);
      if (studentRows && studentRows.length > 0) {
        admission_number = studentRows[0].admission_number;
        grade_level = studentRows[0].grade_level;
      }
    }

    // Fetch staff-specific data if applicable
    let staffDept = profile.department;
    let staffDesignation = profile.designation;
    if (profile.user_category === "staff" || profile.user_category === "admin") {
      const { data: staffRows } = await admin
        .from("staff")
        .select("department, designation")
        .eq("profile_id", session.userId)
        .limit(1);
      if (staffRows && staffRows.length > 0) {
        staffDept = staffRows[0].department;
        staffDesignation = staffRows[0].designation;
      }
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        role: profile.role,
        user_category: profile.user_category,
        campus_id: profile.campus_id,
        department: staffDept,
        designation: staffDesignation,
        admission_number,
        grade_level,
      },
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[settings/profile GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT — update current user's profile
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();

    const allowedFields = ["full_name", "phone", "avatar_url"];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { error: updateError } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", session.userId);

    if (updateError) {
      console.error("[settings/profile PUT] Update error:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update profile: " + updateError.message },
        { status: 500 }
      );
    }

    // Audit log
    await logAudit({
      user_id: session.userId,
      action: "PROFILE_UPDATED",
      table_name: "profiles",
      record_id: session.userId,
      new_data: updates,
      ip_address: getClientIP(req),
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatusCode(error) || 401 }
      );
    }
    console.error("[settings/profile PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
