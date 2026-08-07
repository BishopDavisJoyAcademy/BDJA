/**
 * BDJA Security Utilities v5.0 - Production Hardened
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";

export const SECURITY_CONFIG = {
  BCRYPT_ROUNDS: 12,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_HISTORY_SIZE: 5,
  MAX_FAILED_LOGINS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
  SESSION_TIMEOUT_MINUTES: 60,
  INACTIVITY_TIMEOUT_MINUTES: 15,
  MFA_ISSUER: "BDJA Platform",
  MAX_UPLOAD_SIZE_MB: 10,
  ALLOWED_UPLOAD_TYPES: [
    "image/jpeg", "image/png", "image/webp", "image/avif",
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ],
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SECURITY_CONFIG.BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

export function generateTempPassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";
  const all = upper + lower + numbers + special;

  let pwd = "";
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < 16; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateDeviceFingerprint(req: any): string {
  const data = `${req.headers.get("user-agent") || ""}|${req.headers.get("accept-language") || ""}`;
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 32);
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function validateFileUpload(file: {
  size: number;
  type: string;
  name: string;
}): { valid: boolean; error?: string } {
  if (file.size > SECURITY_CONFIG.MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `File too large. Max ${SECURITY_CONFIG.MAX_UPLOAD_SIZE_MB}MB` };
  }
  if (!SECURITY_CONFIG.ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    return { valid: false, error: "File type not allowed" };
  }
  // Check for dangerous extensions
  const dangerous = [".exe", ".bat", ".cmd", ".sh", ".php", ".jsp", ".asp", ".dll", ".scr"];
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (dangerous.includes(ext)) {
    return { valid: false, error: "Dangerous file type" };
  }
  return { valid: true };
}

export function generateChecksum(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// Password history
const passwordHistory: Map<string, string[]> = new Map();

export async function addPasswordToHistory(userId: string, hash: string): Promise<void> {
  const history = passwordHistory.get(userId) || [];
  history.unshift(hash);
  if (history.length > SECURITY_CONFIG.PASSWORD_HISTORY_SIZE) {
    history.pop();
  }
  passwordHistory.set(userId, history);
}

export async function isPasswordReused(userId: string, password: string): Promise<boolean> {
  const history = passwordHistory.get(userId) || [];
  for (const oldHash of history) {
    if (await bcrypt.compare(password, oldHash)) {
      return true;
    }
  }
  return false;
}

// Rate limiting helpers
export function getClientIp(req: any): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// CSRF token generation
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("base64");
}

export function verifyCsrfToken(token: string, stored: string): boolean {
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(stored)
    );
  } catch {
    return false;
  }
}

// Secure headers helper
export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  };
}
