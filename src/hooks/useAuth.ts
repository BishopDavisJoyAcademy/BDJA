"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/hooks/useStore";
import { UserRole } from "@/types";
import toast from "react-hot-toast";

export interface AuthUser {
  id: string;
  email: string | null;
  role: UserRole;
  full_name: string;
  password_changed: boolean;
  onboarding_completed: boolean;
  is_active: boolean;
  campus_id: string | null;
}

export type AuthErrorType =
  | "none"
  | "no_session"
  | "invalid_token"
  | "profile_missing"
  | "account_suspended"
  | "account_locked"
  | "password_required"
  | "onboarding_required"
  | "network_error"
  | "server_error"
  | "unknown";

export interface AuthError {
  type: AuthErrorType;
  message: string;
  recoverable: boolean;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  error: AuthError | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const SESSION_TIMEOUT_MS = 5000;
const PROFILE_FETCH_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

async function fetchProfileWithRetry(token: string, retries: number = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROFILE_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMessage = data.error || `HTTP ${res.status}`;
        if (res.status === 404 && data.error?.includes("Profile not found")) {
          return { profile: null, error: "profile_missing" };
        }
        if (res.status === 401) return { profile: null, error: "invalid_token" };
        if (attempt < retries && res.status >= 500) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        return { profile: null, error: errorMessage };
      }
      const data = await res.json();
      return { profile: data.profile, error: null };
    } catch (e: any) {
      clearTimeout(timeout);
      if (e.name === "AbortError") {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        return { profile: null, error: "Profile fetch timed out" };
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      return { profile: null, error: e.message || "Network error" };
    }
  }
  return { profile: null, error: "Max retries exceeded" };
}

async function getSessionWithTimeout(ms: number = SESSION_TIMEOUT_MS) {
  return Promise.race([
    supabase.auth.getSession(),
    new Promise<{ data: { session: null }; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error("Session check timed out")), ms)
    ),
  ]);
}

async function attemptProfileRecovery(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/recover", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "restore_own_profile" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function useAuth(requireAuth: boolean = true): UseAuthReturn {
  const router = useRouter();
  const { setUser, clearUser } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [user, setLocalUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<AuthError | null>(null);
  const isProcessingRef = useRef(false);

  const clearError = useCallback(() => { setError(null); }, []);

  const handleAuthError = useCallback((authError: AuthError, shouldRedirect: boolean = true) => {
    setError(authError);
    setLocalUser(null);
    clearUser();
    if (shouldRedirect && requireAuth) {
      const params = new URLSearchParams();
      if (authError.type !== "none") {
        params.set("error", authError.type);
        if (authError.message) params.set("error_detail", authError.message);
      }
      router.replace(`/login?${params.toString()}`);
    }
  }, [router, clearUser, requireAuth]);

  const processValidProfile = useCallback((profile: any, userId: string, email: string | null) => {
    if (profile.is_active === false) {
      handleAuthError({
        type: "account_suspended",
        message: "Your account has been suspended. Please contact the administrator.",
        recoverable: false,
      });
      return;
    }
    const authUser: AuthUser = {
      id: userId,
      email: email ?? null,
      role: (profile.role as UserRole) || "student",
      full_name: profile.full_name || "User",
      password_changed: profile.password_changed ?? false,
      onboarding_completed: profile.onboarding_completed ?? false,
      is_active: profile.is_active ?? true,
      campus_id: profile.campus_id || null,
    };
    setLocalUser(authUser);
    setUser(authUser as any);
    setError(null);
    if (!authUser.password_changed) {
      router.replace("/reset-password?first=true");
      return;
    }
    if (!authUser.onboarding_completed) {
      router.replace("/onboarding");
      return;
    }
  }, [handleAuthError, setUser, router]);

  const refreshUser = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      let session;
      try {
        const result = await getSessionWithTimeout();
        session = result.data.session;
      } catch (timeoutError) {
        console.error("[useAuth] Session timeout:", timeoutError);
        handleAuthError({
          type: "network_error",
          message: "Connection timed out. Please check your internet and try again.",
          recoverable: true,
        });
        return;
      }
      if (!session?.user) {
        handleAuthError({ type: "no_session", message: "Please log in to continue.", recoverable: true });
        return;
      }
      const { profile, error: profileError } = await fetchProfileWithRetry(session.access_token);
      if (profileError === "profile_missing" || !profile) {
        console.warn("[useAuth] Profile missing, attempting recovery...");
        const recovered = await attemptProfileRecovery(session.access_token);
        if (recovered) {
          const retryResult = await fetchProfileWithRetry(session.access_token, 1);
          if (retryResult.profile) {
            return processValidProfile(retryResult.profile, session.user.id, session.user.email);
          }
        }
        handleAuthError({
          type: "profile_missing",
          message: "Your account profile is missing. Please contact the administrator.",
          recoverable: false,
        });
        return;
      }
      return processValidProfile(profile, session.user.id, session.user.email);
    } catch (unexpectedError: any) {
      console.error("[useAuth] Unexpected error:", unexpectedError);
      handleAuthError({ type: "unknown", message: "An unexpected error occurred. Please try again.", recoverable: true });
    } finally {
      isProcessingRef.current = false;
    }
  }, [handleAuthError, processValidProfile]);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;
    const init = async () => {
      if (cancelled) return;
      setLoading(true);
      await refreshUser();
      if (!cancelled) setLoading(false);
    };
    init();
    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        if (event === "SIGNED_OUT") {
          clearUser();
          setLocalUser(null);
          setError(null);
          setLoading(false);
          return;
        }
        if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
          setLoading(true);
          await refreshUser();
          if (!cancelled) setLoading(false);
        }
      }
    );
    subscription = sub;
    return () => { cancelled = true; subscription?.unsubscribe(); };
  }, [refreshUser, clearUser]);

  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch (err) { console.error("[useAuth] Sign out error:", err); }
    clearUser();
    setLocalUser(null);
    setError(null);
    window.location.href = "/login";
  }, [clearUser]);

  return { user, loading, error, signOut, refreshUser, clearError };
}
