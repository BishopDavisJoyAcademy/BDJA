/**
 * BDJA Session Management v4.0
 * Supports BOTH Bearer token AND cookie-based session validation.
 */

import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "./supabase-server";
import { checkAccountLockout } from "./security";
import { UserCategory, UserRole } from "@/types";

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
  userCategory: UserCategory;
  fullName: string;
  campusId: string | null;
  passwordChanged: boolean;
  onboardingCompleted: boolean;
  isActive: boolean;
  accessToken: string;
}

export async function validateSession(
  req: Request
): Promise<{ session: ValidatedSession | null; error: AuthError | null }> {
  try {
    // Try Bearer token first
    const authHeader = req.headers.get("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    let userId: string | null = null;
    let userEmail: string | null = null;
    let accessToken: string = "";

    if (bearerToken) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return []; }, setAll() {} } }
      );
      const { data: { user }, error: userError } = await supabase.auth.getUser(bearerToken);
      if (userError || !user) {
        return {
          session: null,
          error: { code: "INVALID_TOKEN", message: "Your session has expired. Please log in again." },
        };
      }
      userId = user.id;
      userEmail = user.email ?? null;
      accessToken = bearerToken;
    } else {
      // Fallback: read session from cookies (standard for API routes)
      const cookieHeader = req.headers.get("cookie") || "";
      const cookies = parseCookies(cookieHeader);
      const refreshToken = cookies["sb-refresh-token"] || "";
      const accessTokenCookie = cookies["sb-access-token"] || "";

      // Try to get user from cookie-based session
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return Object.entries(cookies).map(([name, value]) => ({ name, value }));
            },
            setAll() {},
          },
        }
      );

      const { data: { user }, error: sessionError } = await supabase.auth.getUser(accessTokenCookie);
      if (sessionError || !user) {
        return {
          session: null,
          error: { code: "NO_SESSION", message: "Please log in to continue." },
        };
      }
      userId = user.id;
      userEmail = user.email ?? null;
      accessToken = accessTokenCookie;
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
      .select("id, email, full_name, role, user_category, campus_id, is_active, password_changed, onboarding_completed")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error(`[session] Profile missing for user ${userId}, attempting recovery...`);
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      if (authUser?.user) {
        const role = authUser.user.user_metadata?.role || "student";
        const userCategory = authUser.user.user_metadata?.user_category ||
          (role === "student" ? "student" : role === "parent" ? "parent" : "admin");
        const { error: insertError } = await admin.from("profiles").insert({
          id: userId,
          email: authUser.user.email || userEmail || "",
          full_name: authUser.user.user_metadata?.full_name || "User",
          role,
          user_category: userCategory,
          campus_id: authUser.user.user_metadata?.campus_id || null,
          is_active: true,
          password_changed: false,
          onboarding_completed: false,
        });
        if (!insertError) {
          console.log(`[session] Profile auto-created for user ${userId}`);
          const { data: newProfile } = await admin
            .from("profiles")
            .select("id, email, full_name, role, user_category, campus_id, is_active, password_changed, onboarding_completed")
            .eq("id", userId)
            .single();
          if (newProfile) {
            return buildSession(newProfile, userId, userEmail || "", accessToken);
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

    return buildSession(profile, userId, userEmail || "", accessToken);
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
  accessToken: string
): { session: ValidatedSession; error: null } {
  const role = (profile.role as UserRole) || "student";
  // Correctly derive user_category from role if missing
  let userCategory: UserCategory = profile.user_category;
  if (!userCategory) {
    if (role === "student") userCategory = "student";
    else if (role === "parent") userCategory = "parent";
    else if (role === "principal" || role === "super_admin") userCategory = "admin";
    else userCategory = "staff";
  }

  return {
    session: {
      userId,
      email,
      role,
      userCategory,
      fullName: profile.full_name || "User",
      campusId: profile.campus_id || null,
      passwordChanged: profile.password_changed ?? false,
      onboardingCompleted: profile.onboarding_completed ?? false,
      isActive: profile.is_active ?? true,
      accessToken,
    },
    error: null,
  };
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

export function requireCategory(session: ValidatedSession, allowedCategories: UserCategory[]): void {
  if (!allowedCategories.includes(session.userCategory)) {
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
