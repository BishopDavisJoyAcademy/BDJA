import { getSupabaseAdmin } from "./supabase-server";
import { Database } from "@/types/database";
import { randomBytes, createHash } from "crypto";

export const SECURITY_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_MAX_AGE_DAYS: 90,
  SESSION_MAX_AGE_MINUTES: 600,
  INACTIVITY_TIMEOUT_MINUTES: 10,
  MAX_CONCURRENT_SESSIONS: 5,
  PASSWORD_HISTORY_COUNT: 5,
  PIN_MIN_LENGTH: 4,
  PIN_MAX_LENGTH: 8,
} as const;

export interface LockoutStatus {
  isLocked: boolean;
  lockedUntil: Date | null;
  failedAttempts: number;
  remainingAttempts: number;
  message: string | null;
}

export async function checkAccountLockout(userId: string): Promise<LockoutStatus> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .rpc("get_lockout_details", { p_user_id: userId })
    .single();

  if (error || !data) {
    return {
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: SECURITY_CONFIG.MAX_FAILED_ATTEMPTS,
      message: null,
    };
  }

  const isLocked = data.is_locked === true;
  const lockedUntil = data.locked_until ? new Date(data.locked_until) : null;

  let message: string | null = null;
  if (isLocked && lockedUntil) {
    const mins = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
    message = `Account locked. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`;
  } else if (data.remaining_attempts > 0 && data.remaining_attempts < SECURITY_CONFIG.MAX_FAILED_ATTEMPTS) {
    message = `${data.remaining_attempts} attempt${data.remaining_attempts !== 1 ? "s" : ""} remaining before lockout.`;
  }

  return { isLocked, lockedUntil, failedAttempts: data.failed_attempts || 0, remainingAttempts: data.remaining_attempts || SECURITY_CONFIG.MAX_FAILED_ATTEMPTS, message };
}

export async function recordFailedLogin(userId: string | null, email: string, ipAddress: string, userAgent: string): Promise<void> {
  if (!userId) {
    console.warn("[security] recordFailedLogin called without userId");
    return;
  }
  const safeUserId: string = userId;
  const admin = getSupabaseAdmin();
  try {
    await admin.rpc("record_login_attempt", {
      p_user_id: safeUserId,
      p_email: email,
      p_success: false,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });
  } catch (error) {
    console.error("[security] recordFailedLogin error:", error);
  }
}

export async function recordSuccessfulLogin(userId: string, email: string, ipAddress: string, userAgent: string): Promise<void> {
  const admin = getSupabaseAdmin();
  try {
    await admin.rpc("record_login_attempt", {
      p_user_id: userId,
      p_email: email,
      p_success: true,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });
  } catch (error) {
    console.error("[security] recordSuccessfulLogin error:", error);
  }
}

export async function recordSession(userId: string, token: string, ipAddress: string, userAgent: string, expiresAt: Date): Promise<void> {
  const admin = getSupabaseAdmin();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    await admin.rpc("record_session", {
      p_user_id: userId,
      p_token_hash: tokenHash,
      p_device_info: { user_agent: userAgent },
      p_ip_address: ipAddress,
      p_expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[security] recordSession error:", error);
  }
}

export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";
  return ip;
}

export function extractDeviceInfo(req: Request): Record<string, string> {
  const ua = req.headers.get("user-agent") || "";
  return {
    user_agent: ua,
    platform: "unknown",
  };
}

export async function hashPassword(password: string): Promise<string> {
  const { hash } = await import("bcryptjs");
  return hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const { compare } = await import("bcryptjs");
  return compare(password, hash);
}

export async function addPasswordToHistory(userId: string, passwordHash: string): Promise<void> {
  const admin = getSupabaseAdmin();
  try {
    await admin.from("password_history").insert({
      user_id: userId,
      password_hash: passwordHash,
    } as { user_id: string; password_hash: string; changed_at: string | null });
    const { data: old } = await admin
      .from("password_history")
      .select("id")
      .eq("user_id", userId)
      .order("changed_at", { ascending: false })
      .limit(100);
    if (old && old.length > SECURITY_CONFIG.PASSWORD_HISTORY_COUNT) {
      const toDelete = old.slice(SECURITY_CONFIG.PASSWORD_HISTORY_COUNT).map((r: { id: string }) => r.id);
      await admin.from("password_history").delete().in("id", toDelete);
    }
  } catch (error) {
    console.error("[security] addPasswordToHistory error:", error);
  }
}

export async function isPasswordReused(userId: string, newPassword: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  try {
    const { data: history } = await admin
      .from("password_history")
      .select("password_hash")
      .eq("user_id", userId)
      .order("changed_at", { ascending: false })
      .limit(SECURITY_CONFIG.PASSWORD_HISTORY_COUNT);
    if (!history) return false;
    for (const row of history) {
      if (await verifyPassword(newPassword, row.password_hash)) return true;
    }
    return false;
  } catch (error) {
    console.error("[security] isPasswordReused error:", error);
    return false;
  }
}

export function generateTempPassword(): string {
  return randomBytes(16).toString("hex").slice(0, 12) + "A1!";
}

export function generatePIN(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
