import { getSupabaseAdmin } from "./supabase-server";
import { checkAccountLockout } from "./security";
import { ValidatedSession, AuthError, UserRole, UserCategory } from "@/types";
import { restoreMissingProfile } from "./auth";

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
      return { session: null, error: { code: "INVALID_TOKEN", message: "Your session has expired. Please log in again." } };
    }

    const tokenHash = require("crypto").createHash("sha256").update(token).digest("hex");
    interface SessionRow {
      id: string;
      revoked_at: string | null;
      expires_at: string;
    }

    const { data: sessionRowRaw, error: sessionError } = await admin
      .from("user_sessions")
      .select("id, revoked_at, expires_at")
      .eq("session_token_hash", tokenHash)
      .single();
    const sessionRow = sessionRowRaw as SessionRow | null;

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
      is_active: boolean;
      password_changed: boolean;
      onboarding_completed: boolean;
    }

    let { data: profileRaw, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name, role, user_category, campus_id, is_active, password_changed, onboarding_completed")
      .eq("id", user.id)
      .single();
    let profile = profileRaw as ProfileSessionRow | null;

    if (profileError || !profile) {
      // Auto-restore missing profile (trigger may have failed or user was created outside the app)
      const restored = await restoreMissingProfile(user.id);
      if (restored) {
        const { data: restoredRaw } = await admin
          .from("profiles")
          .select("id, email, full_name, role, user_category, campus_id, is_active, password_changed, onboarding_completed")
          .eq("id", user.id)
          .single();
        profile = restoredRaw as ProfileSessionRow | null;
      }
      if (!profile) {
        return { session: null, error: { code: "PROFILE_MISSING", message: "Your account profile is missing. Please contact the administrator.", details: profileError?.message } };
      }
    }

    if (!profile.is_active) {
      return { session: null, error: { code: "ACCOUNT_SUSPENDED", message: "Your account has been suspended. Please contact the administrator." } };
    }

    const lockout = await checkAccountLockout(profile.id);
    if (lockout.isLocked) {
      return { session: null, error: { code: "ACCOUNT_LOCKED", message: lockout.message || "Account is locked due to too many failed login attempts." } };
    }

    const { data: permsData } = await admin.rpc("get_user_permissions", { p_user_id: profile.id });
    const permissions = (permsData || []).map((p: any) => p.permission_key || p);

    const session: ValidatedSession = {
      userId: profile.id,
      email: profile.email,
      role: profile.role as UserRole,
      userCategory: profile.user_category as UserCategory,
      fullName: profile.full_name,
      campusId: profile.campus_id,
      passwordChanged: profile.password_changed,
      onboardingCompleted: profile.onboarding_completed,
      isActive: profile.is_active,
      permissions,
    };

    return { session, error: null };
  } catch (error: any) {
    console.error("[session] Validation error:", error);
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
