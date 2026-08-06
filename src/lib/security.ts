/**
 * BDJA Security Utilities v3.0
 */

import { getSupabaseAdmin } from "./supabase-server";
import crypto from "crypto";

export const SECURITY_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
  LOCKOUT_EXPONENTIAL_MULTIPLIER: 2,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_MAX_AGE_DAYS: 90,
  SESSION_MAX_AGE_MINUTES: 600,
  INACTIVITY_TIMEOUT_MINUTES: 10,
  MAX_CONCURRENT_SESSIONS: 5,
  PASSWORD_HISTORY_COUNT: 5,
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

  return {
    isLocked,
    lockedUntil,
    failedAttempts: data.failed_attempts || 0,
    remainingAttempts: data.remaining_attempts || SECURITY_CONFIG.MAX_FAILED_ATTEMPTS,
    message,
  };
}

export async function recordFailedLogin(
  userId: string | null,
  email: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  const admin = getSupabaseAdmin();
  try {
    await admin.rpc("record_login_attempt", {
      p_user_id: userId,
      p_email: email,
      p_success: false,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });
  } catch (err) {
    console.error("[security] Failed to record failed login:", err);
  }
}

export async function recordSuccessfulLogin(
  userId: string,
  email: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  const admin = getSupabaseAdmin();
  try {
    await admin.rpc("record_login_attempt", {
      p_user_id: userId,
      p_email: email,
      p_success: true,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });
  } catch (err) {
    console.error("[security] Failed to record successful login:", err);
  }
}

export async function unlockAccount(
  adminId: string,
  targetUserId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const admin = getSupabaseAdmin();
  try {
    await admin.rpc("unlock_account", {
      p_user_id: targetUserId,
      p_admin_id: adminId,
      p_reason: reason,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to unlock account" };
  }
}

export interface DeviceInfo {
  browser?: string;
  os?: string;
  device?: string;
  screen?: string;
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function recordSession(
  userId: string,
  token: string,
  deviceInfo: DeviceInfo,
  ipAddress: string,
  expiresAt: Date
): Promise<void> {
  const admin = getSupabaseAdmin();
  const tokenHash = hashSessionToken(token);
  try {
    await admin.rpc("record_session", {
      p_user_id: userId,
      p_token_hash: tokenHash,
      p_device_info: deviceInfo,
      p_ip_address: ipAddress,
      p_expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[security] Failed to record session:", err);
  }
}

export async function revokeAllSessions(
  userId: string,
  adminId: string,
  reason: string
): Promise<void> {
  const admin = getSupabaseAdmin();
  try {
    await admin.rpc("force_logout_all_sessions", {
      p_user_id: userId,
      p_admin_id: adminId,
      p_reason: reason,
    });
  } catch (err) {
    console.error("[security] Failed to revoke sessions:", err);
  }
}

export async function getActiveSessions(userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("user_sessions")
    .select("id, device_info, ip_address, last_active_at, expires_at, created_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("last_active_at", { ascending: false });

  if (error) {
    console.error("[security] Failed to get active sessions:", error);
    return [];
  }
  return data || [];
}

export function extractDeviceInfo(req: Request): DeviceInfo {
  const userAgent = req.headers.get("user-agent") || "";
  return {
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    device: detectDevice(userAgent),
  };
}

function detectBrowser(ua: string): string {
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edge/")) return "Edge";
  if (ua.includes("Opera") || ua.includes("OPR/")) return "Opera";
  return "Unknown";
}

function detectOS(ua: string): string {
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Unknown";
}

function detectDevice(ua: string): string {
  if (ua.includes("Mobile")) return "Mobile";
  if (ua.includes("Tablet")) return "Tablet";
  return "Desktop";
}

export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP;
  return "unknown";
}

export async function isPasswordReused(userId: string, passwordHash: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("password_history")
    .select("id")
    .eq("user_id", userId)
    .eq("password_hash", passwordHash)
    .limit(1);
  if (error) {
    console.error("[security] Failed to check password history:", error);
    return false;
  }
  return (data?.length || 0) > 0;
}

export async function addPasswordToHistory(userId: string, passwordHash: string): Promise<void> {
  const admin = getSupabaseAdmin();
  try {
    await admin.from("password_history").insert({
      user_id: userId,
      password_hash: passwordHash,
    });
    const { data: oldPasswords } = await admin
      .from("password_history")
      .select("id")
      .eq("user_id", userId)
      .order("changed_at", { ascending: false })
      .range(SECURITY_CONFIG.PASSWORD_HISTORY_COUNT, 100);
    if (oldPasswords && oldPasswords.length > 0) {
      const idsToDelete = oldPasswords.map((p: { id: string }) => p.id);
      await admin.from("password_history").delete().in("id", idsToDelete);
    }
  } catch (err) {
    console.error("[security] Failed to add password to history:", err);
  }
}

export interface PasswordStrength {
  score: number;
  label: string;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  allMet: boolean;
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  const requirements = {
    length: password.length >= SECURITY_CONFIG.PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const metCount = Object.values(requirements).filter(Boolean).length;
  let score = metCount;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  return {
    score: Math.min(score, 5),
    label: labels[Math.min(score, 5)],
    requirements,
    allMet: metCount >= 5,
  };
}

export async function detectSuspiciousActivity(
  userId: string,
  ipAddress: string
): Promise<{ isSuspicious: boolean; reason?: string }> {
  const admin = getSupabaseAdmin();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("login_audit")
    .select("ip_address, created_at")
    .eq("user_id", userId)
    .eq("action", "login_failed")
    .gte("created_at", fiveMinutesAgo)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return { isSuspicious: false };
  if (data.length >= 10) return { isSuspicious: true, reason: "Too many failed attempts in 5 minutes" };
  const uniqueIPs = new Set(data.map((d) => d.ip_address));
  if (uniqueIPs.size >= 3) return { isSuspicious: true, reason: "Login attempts from multiple IPs" };
  return { isSuspicious: false };
}
