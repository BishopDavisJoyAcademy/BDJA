"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { AuthUser } from "@/types";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: { type: string; message: string } | null;
}

interface SignInResult {
  success: boolean;
  error: string | null;
  mustChangePassword?: boolean;
  userCategory?: string | null;
  redirectTo?: string;
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  user_category: string | null;
  campus_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  password_changed: boolean;
}

const AUTH_TIMEOUT_MS = 10000;

function getDashboardPath(category: string | null): string {
  if (category === "admin") return "/admin";
  if (category === "student") return "/student";
  if (category === "parent") return "/parent";
  if (category === "staff") return "/teacher";
  return "/dashboard";
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const initRef = useRef(false);

  const buildUser = useCallback((p: ProfileRow, perms: string[]): AuthUser => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    role: p.role,
    user_category: p.user_category,
    campus_id: p.campus_id,
    avatar_url: p.avatar_url,
    is_active: p.is_active,
    must_change_password: !p.password_changed,
    permissions: perms,
  }), []);

  const fetchUser = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ user: null, loading: false, error: null });
        return null;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      // Explicit type guard to avoid Supabase never inference
      const profile = profileData as unknown as ProfileRow | null;

      if (profileError || !profile || !profile.is_active) {
        setState({ user: null, loading: false, error: null });
        return null;
      }

      const { data: permData } = await supabase
        .from("staff_permissions")
        .select("permissions(key)")
        .eq("profile_id", profile.id);

      const permissions = (permData || [])
        .map((row: { permissions: { key: string }[] }) => row.permissions?.[0]?.key)
        .filter((k): k is string => Boolean(k));

      const user = buildUser(profile, permissions);
      setState({ user, loading: false, error: null });
      return user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Auth initialization failed";
      setState({ user: null, loading: false, error: { type: "auth", message: msg } });
      return null;
    }
  }, [buildUser]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setState((s) => {
        if (s.loading) {
          return { user: null, loading: false, error: { type: "timeout", message: "Authentication timed out. Please reload." } };
        }
        return s;
      });
    }, AUTH_TIMEOUT_MS);

    fetchUser().finally(() => {
      if (!timedOut) clearTimeout(timeoutId);
    });

    let listener: { subscription: { unsubscribe: () => void } } | null = null;
    try {
      const supabase = getSupabaseClient();
      const { data: l } = supabase.auth.onAuthStateChange(
        (event: string) => {
          if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
            fetchUser();
          }
        }
      );
      listener = l;
    } catch {
      // Supabase not initialized
    }

    return () => {
      clearTimeout(timeoutId);
      listener?.subscription.unsubscribe();
    };
  }, [fetchUser]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          setState((s) => ({ ...s, loading: false, error: { type: "auth", message: error?.message || "Invalid credentials" } }));
          return { success: false, error: error?.message || "Invalid credentials" };
        }
        // Fetch profile immediately to determine redirect
        const { data: profileData } = await supabase
          .from("profiles")
          .select("password_changed, role, user_category, is_active")
          .eq("id", data.user.id)
          .single();

        const profile = profileData as unknown as { password_changed: boolean; role: string; user_category: string; is_active: boolean } | null;

        if (!profile || !profile.is_active) {
          await supabase.auth.signOut();
          setState({ user: null, loading: false, error: { type: "auth", message: "Account inactive" } });
          return { success: false, error: "Account inactive" };
        }

        const user = await fetchUser();
        const redirectTo = getDashboardPath(profile.user_category);
        return {
          success: true,
          error: null,
          mustChangePassword: !profile.password_changed,
          userCategory: profile.user_category,
          redirectTo,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid credentials";
        setState((s) => ({ ...s, loading: false, error: { type: "auth", message } }));
        return { success: false, error: message };
      }
    },
    [fetchUser]
  );

  const signInStudent = useCallback(
    async (admissionNumber: string, pin: string): Promise<SignInResult> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch("/api/auth/student-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admission_number: admissionNumber, pin }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setState((s) => ({ ...s, loading: false, error: { type: "auth", message: data.error || "Invalid admission number or PIN" } }));
          return { success: false, error: data.error || "Invalid admission number or PIN" };
        }

        if (data.session?.access_token && data.session?.refresh_token) {
          const supabase = getSupabaseClient();
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }

        const user = await fetchUser();
        return {
          success: true,
          error: null,
          mustChangePassword: user?.must_change_password,
          userCategory: user?.user_category,
          redirectTo: getDashboardPath(user?.user_category || "student"),
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Login failed";
        setState((s) => ({ ...s, loading: false, error: { type: "auth", message } }));
        return { success: false, error: message };
      }
    },
    [fetchUser]
  );

  const signOut = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setState({ user: null, loading: false, error: null });
  }, []);

  const refresh = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signIn,
    signInStudent,
    signOut,
    refresh,
  };
}
