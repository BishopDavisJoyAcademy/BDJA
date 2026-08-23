import { getSupabaseAdmin } from "./supabase-server";
import { checkAccountLockout } from "./security";
import { ValidatedSession, AuthError, UserRole, UserCategory } from "@/types";
import { restoreMissingProfile } from "./auth";

/**
 * Type-safe runtime check for account suspension.
 * Supabase generated types may narrow `is_active` to `true | null`,
 * but the database column is `boolean | null`. We accept `unknown`
 * and use strict equality to safely detect explicit `false`.
 */
function isAccountSuspended(value: unknown): value is false {
  return value === false;
}

export class AuthRequiredError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "AuthRequiredError";
    this.statusCode = statusCode;
  }
}

export async function validateSession(token: string): Promise<{ session: ValidatedSession | null; error: AuthError | null }> {
  try {
    if (!token || typeof token !== "string") {
      return { session: null, error: { code: "NO_SESSION", message: "Please log in to continue." } };
    }

    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      console.error("[validateSession] auth.getUser failed:", authError?.message);
      return { session: null, error: { code: "INVALID_TOKEN", message: "Your session has expired. Please log in again." } };
    }

    console.log("[validateSession] Auth user found:", user.id, user.email);

    const tokenHash = require("crypto").createHash("sha256").update(token).digest("hex");
    interface SessionRow {
      id: string;
      revoked_at: string | null;
      expires_at: string;
    }

    const { data: sessionRows } = await admin
      .from("user_sessions")
      .select("id, revoked_at, expires_at")
      .eq("session_token_hash", tokenHash)
      .limit(1);
    const sessionRow = (sessionRows?.[0] ?? null) as SessionRow | null;

    if (sessionRow?.revoked_at) {
      return { session: null, error: { code: "INVALID_TOKEN", message: "Session has been revoked. Please log in again." } };
    }
    if (sessionRow && new Date(sessionRow.expires_at) < new Date()) {
      return { session: null, error: { code: "INVALID_TOKEN", message: "Session has expired. Please log in again." } };
    }

    interface ProfileSessionRow {
      id: string;
      email: string;
      full_name: string;
      role: string;
      user_category: string;
      campus_id: string | null;
      is_active: boolean | null;
      password_changed: boolean;
      onboarding_completed: boolean;
    }

    // Strategy 1: Query by ID (normal path)
    let { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name, role, user_category, campus_id, is_active, password_changed, onboarding_completed")
      .eq("id", user.id)
      .limit(1);
    let profile = (profileRows?.[0] ?? null) as ProfileSessionRow | null;

    console.log("[validateSession] Profile by ID:", profile ? "FOUND" : "MISSING", "error:", profileError?.message || "none");

    // Strategy 2: Query by email (ID mismatch fallback)
    if (!profile && user.email) {
      const { data: emailRows, error: emailError } = await admin
        .from("profiles")
        .select("id, email, full_name, role, user_category, campus_id, is_active, password_changed, onboarding_completed")
        .eq("email", user.email)
        .limit(1);
      profile = (emailRows?.[0] ?? null) as ProfileSessionRow | null;
      console.log("[validateSession] Profile by email:", profile ? "FOUND" : "MISSING", "error:", emailError?.message || "none");
    }

    // Strategy 3: Auto-restore missing profile
    if (!profile) {
      console.log("[validateSession] Attempting restoreMissingProfile for:", user.id);
      const restored = await restoreMissingProfile(user.id);
      console.log("[validateSession] restoreMissingProfile result:", restored);
      if (restored) {
        const { data: restoredRows, error: restoredError } = await admin
          .from("profiles")
          .select("id, email, full_name, role, user_category, campus_id, is_active, password_changed, onboarding_completed")
          .eq("id", user.id)
          .limit(1);
        profile = (restoredRows?.[0] ?? null) as ProfileSessionRow | null;
        console.log("[validateSession] Profile after restore:", profile ? "FOUND" : "STILL MISSING", "error:", restoredError?.message || "none");
      }
    }

    if (!profile) {
      console.error("[validateSession] CRITICAL: Profile completely missing for user:", user.id, user.email);
      return { session: null, error: { code: "PROFILE_MISSING", message: "Your account profile is missing. Please contact the administrator." } };
    }

    // CRITICAL FIX: Only explicit false means inactive. NULL/true = active.
    if (isAccountSuspended(profile.is_active)) {
      return { session: null, error: { code: "ACCOUNT_SUSPENDED", message: "Your account has been suspended. Please contact the administrator." } };
    }

    const lockout = await checkAccountLockout(profile.id);
    if (lockout.isLocked) {
      return { session: null, error: { code: "ACCOUNT_LOCKED", message: lockout.message || "Account is locked due to too many failed login attempts." } };
    }

    const { data: permsData } = await admin.rpc("get_user_permissions", { p_user_id: profile.id });
    const permissions = (permsData || []).map((p: { permission_key?: string } | string) => typeof p === "string" ? p : (p.permission_key || String(p)));

    const session: ValidatedSession = {
      userId: profile.id,
      email: profile.email,
      role: profile.role as UserRole,
      userCategory: profile.user_category as UserCategory,
      fullName: profile.full_name,
      campusId: profile.campus_id,
      passwordChanged: profile.password_changed,
      onboardingCompleted: profile.onboarding_completed,
      isActive: !isAccountSuspended(profile.is_active),
      permissions,
    };

    return { session, error: null };
  } catch (error: unknown) {
    console.error("[validateSession] Validation error:", error);
    return { session: null, error: { code: "INTERNAL_ERROR", message: "Session validation failed. Please try again." } };
  }
}

export async function requireAuth(req: Request): Promise<ValidatedSession> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || "";

  const { session, error } = await validateSession(token);
  if (!session || error) {
    throw new AuthRequiredError(error?.message || "Authentication required", error?.code === "ACCOUNT_LOCKED" ? 403 : 401);
  }
  return session;
}

export function requirePermission(session: ValidatedSession, permission: string): void {
  if (!session.permissions.includes(permission) && session.userCategory !== "admin") {
    throw new AuthRequiredError("You do not have permission to perform this action.", 403);
  }
}

export function requireAnyPermission(session: ValidatedSession, permissions: string[]): void {
  const hasAny = permissions.some((p) => session.permissions.includes(p));
  if (!hasAny && session.userCategory !== "admin") {
    throw new AuthRequiredError("You do not have permission to perform this action.", 403);
  }
}
