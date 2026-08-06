/**
 * POST /api/auth/change-password
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { firstLoginPasswordSchema, changePasswordSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import { isPasswordReused, addPasswordToHistory } from "@/lib/security";
import { getClientIP, extractDeviceInfo } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { session, error: sessionError } = await validateSession(req);
    if (sessionError || !session) {
      return NextResponse.json(
        { error: sessionError?.message || "Unauthorized", code: sessionError?.code },
        { status: 401 }
      );
    }
    const userId = session.userId;
    const userEmail = session.email;
    const body = await req.json() as Record<string, any>;
    const isFirstLogin = body.is_first_login === true;
    let newPassword: string;

    if (isFirstLogin) {
      const parseResult = firstLoginPasswordSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parseResult.error.flatten() },
          { status: 400 }
        );
      }
      newPassword = parseResult.data.new_password;
    } else {
      const parseResult = changePasswordSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parseResult.error.flatten() },
          { status: 400 }
        );
      }
      const admin = getSupabaseAdmin();
      const { error: signInError } = await admin.auth.signInWithPassword({
        email: userEmail,
        password: parseResult.data.current_password,
      });
      if (signInError) {
        return NextResponse.json(
          { error: "Current password is incorrect", code: "INVALID_PASSWORD" },
          { status: 400 }
        );
      }
      newPassword = parseResult.data.new_password;
    }

    const newPasswordHash = await hashPassword(newPassword);
    const isReused = await isPasswordReused(userId, newPasswordHash);
    if (isReused) {
      return NextResponse.json(
        { error: "You cannot reuse a previous password. Please choose a new one.", code: "PASSWORD_REUSED" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message, code: "UPDATE_FAILED" },
        { status: 500 }
      );
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        password_changed: true,
        temp_password_hash: null,
        last_password_change: new Date().toISOString(),
      })
      .eq("id", userId);
    if (profileError) {
      console.error("[change-password] Profile update failed:", profileError);
      return NextResponse.json(
        { error: "Password updated but profile sync failed", code: "SYNC_FAILED" },
        { status: 500 }
      );
    }

    await addPasswordToHistory(userId, newPasswordHash);
    await admin.from("account_lockouts").delete().eq("user_id", userId).catch(() => {});
    await admin
      .from("user_sessions")
      .update({ revoked_at: new Date().toISOString(), revoked_reason: "password_changed" })
      .eq("user_id", userId)
      .is("revoked_at", null)
      .catch(() => {});

    const ipAddress = getClientIP(req);
    const deviceInfo = extractDeviceInfo(req);
    await logAudit({
      user_id: userId,
      action: "PASSWORD_CHANGED",
      target_type: "profile",
      target_id: userId,
      metadata: { is_first_login: isFirstLogin, device: deviceInfo },
      ip_address: ipAddress,
      user_agent: req.headers.get("user-agent") || undefined,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
      code: "PASSWORD_UPDATED",
    });
  } catch (error: any) {
    console.error("[change-password] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
