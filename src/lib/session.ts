/**
 * BDJA Session Management v3.0
 */

import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "./supabase-server";
import { checkAccountLockout } from "./security";
import { UserRole } from "@/types";

export type AuthErrorCode =
  | "NO_SESSION"
  | "INVALID_TOKEN"
  | "PROFILE_MISSING"
  | "PROFILE_INACTIVE"
  | "ACCOUNT_LOCKED"
  | "PASSWORD_REQUIRED"
  | "ONBOARDING_REQUIRED"
  | "SERVER_ERROR"
  | "FORBIDDEN"
  | "RATE_LIMITED";

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: string;
  retryAfter?: number;
}

export interface ValidatedSession {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  campusId: string | null;
  passwordChanged: boolean;
  onboardingCompleted: boolean;
  isActive: boolean;
  accessToken: string;
  expiresAt: string;
}

export async function validateSession(
  req: Request
): Promise<{ session: ValidatedSession | null; error: AuthError | null }> {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    let userId: string | null = null;
    let userEmail: string | null = null;
    let accessToken: string | null = null;
    let expiresAt: string | null = null;

    if (token) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return []; }, setAll() {} } }
      );
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return {
          session: null,
          error: { code: "INVALID_TOKEN", message: "Your session has expired. Please log in again." },
        };
      }
      userId = user.id;
      userEmail = user.email ?? null;
      accessToken = token;
      expiresAt = user.confirmed_at || new Date(Date.now() + 3600 * 1000).toISOString();
    } else {
      return {
        session: null,
        error: { code: "NO_SESSION", message: "Please log in to continue." },
      };
    }

    if (!userId) {
      return {
        session: null,
        error: { code: "NO_SESSION", message: "Please log in to continue." },
      };
    }

    const admin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name, role, campus_id, is_active, password_changed, onboarding_completed")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error(`[session] Profile missing for user ${userId}, attempting recovery...`);
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      if (authUser?.user) {
        const { error: insertError } = await admin.from("profiles").insert({
          id: userId,
          email: authUser.user.email || userEmail || "",
          full_name: authUser.user.user_metadata?.full_name || "User",
          role: authUser.user.user_metadata?.role || "student",
          campus_id: authUser.user.user_metadata?.campus_id || null,
          is_active: true,
          password_changed: false,
          onboarding_completed: false,
        });
        if (!insertError) {
          console.log(`[session] Profile auto-created for user ${userId}`);
          const { data: newProfile } = await admin
            .from("profiles")
            .select("id, email, full_name, role, campus_id, is_active, password_changed, onboarding_completed")
            .eq("id", userId)
            .single();
          if (newProfile) {
            return buildSession(newProfile, userId, userEmail || "", accessToken || "", expiresAt || "");
          }
        }
      }
      return {
        session: null,
        error: {
          code: "PROFILE_MISSING",
          message: "Your account profile is missing. Please contact the administrator.",
          details: profileError?.message,
        },
      };
    }

    const lockoutStatus = await checkAccountLockout(userId);
    if (lockoutStatus.isLocked && lockoutStatus.lockedUntil) {
      const mins = Math.ceil((lockoutStatus.lockedUntil.getTime() - Date.now()) / 60000);
      return {
        session: null,
        error: {
          code: "ACCOUNT_LOCKED",
          message: `Account temporarily locked due to too many failed attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
          retryAfter: mins * 60,
        },
      };
    }

    if (profile.is_active === false) {
      return {
        session: null,
        error: {
          code: "PROFILE_INACTIVE",
          message: "Your account has been suspended. Please contact the administrator.",
        },
      };
    }

    return buildSession(profile, userId, userEmail || "", accessToken || "", expiresAt || "");
  } catch (error: any) {
    console.error("[session] Validation error:", error);
    return {
      session: null,
      error: {
        code: "SERVER_ERROR",
        message: "An unexpected error occurred. Please try again.",
        details: error.message,
      },
    };
  }
}

function buildSession(
  profile: any,
  userId: string,
  email: string,
  accessToken: string,
  expiresAt: string
): { session: ValidatedSession; error: null } {
  return {
    session: {
      userId,
      email,
      role: (profile.role as UserRole) || "student",
      fullName: profile.full_name || "User",
      campusId: profile.campus_id || null,
      passwordChanged: profile.password_changed ?? false,
      onboardingCompleted: profile.onboarding_completed ?? false,
      isActive: profile.is_active ?? true,
      accessToken,
      expiresAt,
    },
    error: null,
  };
}

export async function validateSessionFromCookies(
  request: Request
): Promise<{ userId: string | null; role: UserRole | null; isActive: boolean | null; error: AuthError | null }> {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const accessToken = cookies["sb-access-token"] || cookies["sb-" + process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] + "-auth-token"];
    if (!accessToken) {
      return { userId: null, role: null, isActive: null, error: { code: "NO_SESSION", message: "No session found" } };
    }
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return []; }, setAll() {} } }
    );
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return { userId: null, role: null, isActive: null, error: { code: "INVALID_TOKEN", message: "Invalid session" } };
    }
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();
    if (!profile) {
      return { userId: null, role: null, isActive: null, error: { code: "PROFILE_MISSING", message: "Profile missing" } };
    }
    return {
      userId: user.id,
      role: (profile.role as UserRole) || "student",
      isActive: profile.is_active ?? true,
      error: null,
    };
  } catch (error: any) {
    console.error("[session] Cookie validation error:", error);
    return { userId: null, role: null, isActive: null, error: { code: "SERVER_ERROR", message: error.message } };
  }
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) cookies[name] = rest.join("=");
  });
  return cookies;
}

export async function requireAuth(req: Request): Promise<ValidatedSession> {
  const { session, error } = await validateSession(req);
  if (error || !session) {
    const statusCode =
      error?.code === "NO_SESSION" || error?.code === "INVALID_TOKEN" ? 401 :
      error?.code === "FORBIDDEN" ? 403 :
      error?.code === "RATE_LIMITED" ? 429 : 500;
    throw new AuthRequiredError(error?.message || "Unauthorized", statusCode, error?.code);
  }
  return session;
}

export function requireRole(session: ValidatedSession, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(session.role)) {
    throw new AuthRequiredError("You do not have permission to access this resource.", 403, "FORBIDDEN");
  }
}

export class AuthRequiredError extends Error {
  statusCode: number;
  code: AuthErrorCode;
  constructor(message: string, statusCode: number = 401, code: AuthErrorCode = "NO_SESSION") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = "AuthRequiredError";
  }
}

export async function refreshSession(token: string): Promise<{ token: string | null; expiresAt: string | null; error: string | null }> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return []; }, setAll() {} } }
    );
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: token });
    if (error || !data.session) {
      return { token: null, expiresAt: null, error: error?.message || "Refresh failed" };
    }
    return {
      token: data.session.access_token,
      expiresAt: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : null,
      error: null,
    };
  } catch (err: any) {
    return { token: null, expiresAt: null, error: err.message };
  }
}
