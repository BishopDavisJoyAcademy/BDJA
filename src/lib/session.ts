"use server";

import { getSupabaseAdmin } from "./supabase-server";
import { checkAccountLockout } from "./security";
import { ValidatedSession, AuthError, UserRole, UserCategory } from "@/types";

export async function validateSession(token: string): Promise<{ session: ValidatedSession | null; error: AuthError | null }> {
  try {
    if (!token || typeof token !== "string") {
      return { session: null, error: { code: "NO_SESSION", message: "Please log in to continue." } };
    }

    const admin = getSupabaseAdmin();

    // Validate token with Supabase Auth
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return { session: null, error: { code: "INVALID_TOKEN", message: "Your session has expired. Please log in again." } };
    }

    // Check server-side session validity
    const tokenHash = require("crypto").createHash("sha256").update(token).digest("hex");
    const { data: sessionRow, error: sessionError } = await admin
      .from("user_sessions")
      .select("id, revoked_at, expires_at")
      .eq("session_token_hash", tokenHash)
      .single();

    if (sessionRow?.revoked_at) {
      return { session: null, error: { code: "INVALID_TOKEN", message: "Session has been revoked. Please log in again." } };
    }
    if (sessionRow && new Date(sessionRow.expires_at) < new Date()) {
      return { session: null, error: { code: "INVALID_TOKEN", message: "Session has expired. Please log in again." } };
    }

    // Fetch profile
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name, role, user_category, campus_id, is_active, password_changed, onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { session: null, error: { code: "PROFILE_MISSING", message: "Your account profile is missing. Please contact the administrator.", details: profileError?.message } };
    }

    // Check lockout
    const lockout = await checkAccountLockout(user.id);
    if (lockout.isLocked && lockout.lockedUntil) {
      const mins = Math.ceil((lockout.lockedUntil.getTime() - Date.now()) / 60000);
      return { session: null, error: { code: "ACCOUNT_LOCKED", message: `Account temporarily locked. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`, retryAfter: mins * 60 } };
    }

    if (profile.is_active === false) {
      return { session: null, error: { code: "PROFILE_INACTIVE", message: "Your account has been suspended. Please contact the administrator." } };
    }

    // Fetch permissions
    const { data: permData } = await admin.rpc("get_user_permissions", { p_user_id: user.id });
    const permissions = (permData || []).map((p: any) => p.permission_key || p);

    const role = (profile.role as UserRole) || "student";
    let userCategory: UserCategory = profile.user_category;
    if (!userCategory) {
      userCategory = role === "student" ? "student" : role === "parent" ? "parent" : role === "admin" ? "admin" : "staff";
    }

    return {
      session: {
        userId: user.id,
        email: profile.email || user.email || "",
        role,
        userCategory,
        fullName: profile.full_name || "User",
        campusId: profile.campus_id || null,
        passwordChanged: profile.password_changed ?? false,
        onboardingCompleted: profile.onboarding_completed ?? false,
        isActive: profile.is_active ?? true,
        permissions,
      },
      error: null,
    };
  } catch (error: any) {
    console.error("[session] Validation error:", error);
    return { session: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred. Please try again.", details: error.message } };
  }
}

export async function requireAuth(req: Request): Promise<ValidatedSession> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const { session, error } = await validateSession(token);
  if (error || !session) {
    const status = error?.code === "NO_SESSION" || error?.code === "INVALID_TOKEN" ? 401 : error?.code === "FORBIDDEN" ? 403 : error?.code === "RATE_LIMITED" ? 429 : 500;
    throw new AuthRequiredError(error?.message || "Unauthorized", status, error?.code || "NO_SESSION");
  }
  return session;
}

export function requireRole(session: ValidatedSession, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(session.role)) {
    throw new AuthRequiredError("You do not have permission to access this resource.", 403, "FORBIDDEN");
  }
}

export function requireCategory(session: ValidatedSession, allowedCategories: UserCategory[]): void {
  if (!allowedCategories.includes(session.userCategory)) {
    throw new AuthRequiredError("You do not have permission to access this resource.", 403, "FORBIDDEN");
  }
}

export function requirePermission(session: ValidatedSession, permission: string): void {
  if (session.userCategory === "admin") return;
  if (!session.permissions.includes(permission)) {
    throw new AuthRequiredError("You do not have permission to access this resource.", 403, "FORBIDDEN");
  }
}

export function requireAnyPermission(session: ValidatedSession, permissions: string[]): void {
  if (session.userCategory === "admin") return;
  if (!permissions.some((p) => session.permissions.includes(p))) {
    throw new AuthRequiredError("You do not have permission to access this resource.", 403, "FORBIDDEN");
  }
}

export class AuthRequiredError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, statusCode: number = 401, code: string = "NO_SESSION") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = "AuthRequiredError";
  }
}
