import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { hashPassword, verifyPassword } from "@/lib/security";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { changePasswordSchema } from "@/lib/validation";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    const body = await req.json();
    const { current_password, new_password, confirm_password } = body;

    // 1. Validate input
    const parseResult = changePasswordSchema.safeParse({ current_password, new_password, confirm_password });
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json({ error: issues }, { status: 400 });
    }

    // 2. Fetch current profile
    const { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("id, email, temp_password_hash, password_changed")
      .eq("id", session.userId)
      .limit(1);

    if (profileError || !profileRows || profileRows.length === 0) {
      console.error("[change-password] Profile not found:", profileError?.message);
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const profile = profileRows[0];

    // 3. Verify current password against temp_password_hash (for first-time changes)
    // or against the actual auth password (for subsequent changes)
    let currentValid = false;
    if (profile.temp_password_hash) {
      currentValid = await verifyPassword(current_password, profile.temp_password_hash);
    }

    if (!currentValid) {
      // Fallback: try verifying against auth user password via sign-in attempt
      const { error: signInError } = await admin.auth.signInWithPassword({
        email: profile.email,
        password: current_password,
      });
      if (signInError) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
      }
    }

    // 4. Hash new password
    const passwordHash = await hashPassword(new_password);
    const nowIso = new Date().toISOString();

    // 5. Update profile WITH verification
    const { data: updatedRows, error: updateError } = await admin
      .from("profiles")
      .update({
        temp_password_hash: passwordHash,
        password_changed: true,
        last_password_change: nowIso,
        updated_at: nowIso,
      })
      .eq("id", session.userId)
      .select("id, password_changed, last_password_change");

    if (updateError) {
      console.error("[change-password] Profile update error:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update password record: " + updateError.message },
        { status: 500 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.error("[change-password] Profile update affected 0 rows. UserId:", session.userId);
      return NextResponse.json(
        { error: "Profile update failed silently — no rows affected" },
        { status: 500 }
      );
    }

    // 6. Double-verify by fetching back
    const { data: verifyRows } = await admin
      .from("profiles")
      .select("password_changed, last_password_change")
      .eq("id", session.userId)
      .limit(1);

    if (!verifyRows || verifyRows.length === 0 || verifyRows[0].password_changed !== true) {
      console.error(
        "[change-password] CRITICAL: Profile verification failed after update. Got:",
        verifyRows?.[0]
      );
      return NextResponse.json(
        { error: "Password change could not be verified. Please try again." },
        { status: 500 }
      );
    }

    // 7. Update auth user password — preserve metadata
    const { data: authUser } = await admin.auth.admin.getUserById(session.userId);
    const existingMetadata = authUser?.user?.user_metadata || {};

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(session.userId, {
      password: new_password,
      user_metadata: {
        ...existingMetadata,
        password_changed: true,
        last_password_change: nowIso,
      },
    });

    if (authUpdateError) {
      console.error("[change-password] Auth update failed:", authUpdateError.message);
      // Rollback profile
      await admin
        .from("profiles")
        .update({ password_changed: false, last_password_change: null, updated_at: nowIso })
        .eq("id", session.userId);
      return NextResponse.json(
        { error: "Failed to update auth password: " + authUpdateError.message },
        { status: 500 }
      );
    }

    // 8. Sign out all sessions globally
    await admin.auth.admin.signOut(session.userId, "global");

    // 9. Audit log
    await logAudit({
      user_id: session.userId,
      action: "PASSWORD_CHANGED",
      table_name: "profiles",
      record_id: session.userId,
      new_data: { password_changed: true, last_password_change: nowIso },
      ip_address: getClientIP(req),
    }).catch((e) => console.error("[change-password] Audit log failed:", e));

    return NextResponse.json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error: unknown) {
    console.error("[change-password] Unhandled error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Internal server error" },
      { status: 500 }
    );
  }
}
