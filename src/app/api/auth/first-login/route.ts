import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { hashPassword, verifyPassword } from "@/lib/security";
import { logAudit } from "@/lib/audit";
import { getClientIP } from "@/lib/security";
import { firstLoginPasswordSchema, firstLoginPINSchema } from "@/lib/validation";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    const body = await req.json();
    const { new_credential, confirm_credential } = body;
    const isStudent = session.userCategory === "student";

    // 1. Fetch current profile
    const { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name, user_category, password_changed, temp_password_hash, role")
      .eq("id", session.userId)
      .limit(1);

    if (profileError || !profileRows || profileRows.length === 0) {
      console.error("[first-login] Profile not found:", profileError?.message);
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const profile = profileRows[0];

    if (profile.password_changed === true) {
      return NextResponse.json(
        { error: "Password already set. Use change-password instead." },
        { status: 403 }
      );
    }

    // 2. Validate new credential
    const schema = isStudent ? firstLoginPINSchema : firstLoginPasswordSchema;
    const parseResult = schema.safeParse({ new_credential, confirm_credential });
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join("; ");
      return NextResponse.json({ error: issues }, { status: 400 });
    }

    // 3. Verify current temp password is still valid
    const { data: authUser } = await admin.auth.admin.getUserById(session.userId);
    if (!authUser?.user) {
      return NextResponse.json({ error: "Auth user not found" }, { status: 404 });
    }

    const currentTempHash = profile.temp_password_hash;
    if (!currentTempHash) {
      return NextResponse.json({ error: "No temporary password on record" }, { status: 400 });
    }

    const isMatch = await verifyPassword(new_credential, currentTempHash);
    if (isMatch) {
      return NextResponse.json(
        { error: "New password cannot be the same as the temporary password" },
        { status: 400 }
      );
    }

    // 4. Hash new credential
    const passwordHash = await hashPassword(new_credential);
    const nowIso = new Date().toISOString();

    // 5. Update profile WITH verification — .select() ensures we know if 0 rows were affected
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
      console.error("[first-login] Profile update error:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update password record: " + updateError.message },
        { status: 500 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.error("[first-login] Profile update affected 0 rows. UserId:", session.userId);
      return NextResponse.json(
        { error: "Profile update failed silently — no rows affected" },
        { status: 500 }
      );
    }

    // 6. Double-verify by fetching the profile back
    const { data: verifyRows } = await admin
      .from("profiles")
      .select("password_changed, last_password_change")
      .eq("id", session.userId)
      .limit(1);

    if (!verifyRows || verifyRows.length === 0 || verifyRows[0].password_changed !== true) {
      console.error(
        "[first-login] CRITICAL: Profile verification failed after update. " +
        "Expected password_changed=true, got:",
        verifyRows?.[0]
      );
      return NextResponse.json(
        { error: "Password change could not be verified. Please try again." },
        { status: 500 }
      );
    }

    // 7. Update auth user password — PRESERVE all existing metadata
    const existingMetadata = authUser.user.user_metadata || {};
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(session.userId, {
      password: new_credential,
      user_metadata: {
        ...existingMetadata,
        password_changed: true,
        last_password_change: nowIso,
      },
    });

    if (authUpdateError) {
      console.error("[first-login] Auth update failed:", authUpdateError.message);
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

    // 8. Audit log
    await logAudit({
      user_id: session.userId,
      action: isStudent ? "STUDENT_FIRST_LOGIN" : "STAFF_FIRST_LOGIN",
      table_name: "profiles",
      record_id: session.userId,
      new_data: { password_changed: true, last_password_change: nowIso },
      ip_address: getClientIP(req),
    }).catch((e) => console.error("[first-login] Audit log failed:", e));

    return NextResponse.json({
      success: true,
      message: isStudent ? "PIN set successfully" : "Password set successfully",
      user_category: profile.user_category,
    });
  } catch (error: unknown) {
    console.error("[first-login] Unhandled error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Internal server error" },
      { status: 500 }
    );
  }
}
