"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const fetchUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ user: null, loading: false, error: null });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      const p = profile as ProfileRow | null;

      if (profileError || !p || !p.is_active) {
        setState({
          user: null,
          loading: false,
          error: { type: "auth", message: "Account inactive or not found" },
        });
        return;
      }

      const { data: permData } = await supabase
        .from("staff_permissions")
        .select("permissions(key)")
        .eq("profile_id", p.id);

      const permissions = (permData || [])
        .map((row: { permissions: { key: string }[] }) => row.permissions?.[0]?.key)
        .filter((k): k is string => Boolean(k));

      setState({
        user: {
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          role: p.role,
          user_category: p.user_category,
          campus_id: p.campus_id,
          avatar_url: p.avatar_url,
          is_active: p.is_active,
          must_change_password: p.password_changed,
          permissions,
        },
        loading: false,
        error: null,
      });
    } catch {
      setState({
        user: null,
        loading: false,
        error: { type: "unknown", message: "Failed to load user" },
      });
    }
  }, []);

  useEffect(() => {
    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: string, _session: unknown) => {
        fetchUser();
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [fetchUser]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setState((s) => ({
            ...s,
            loading: false,
            error: { type: "auth", message: error.message },
          }));
          return { success: false, error: error.message };
        }

        await fetchUser();
        return {
          success: true,
          error: null,
          mustChangePassword: data.user?.user_metadata?.must_change_password === true,
        };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Invalid credentials";
        setState((s) => ({
          ...s,
          loading: false,
          error: { type: "auth", message },
        }));
        return { success: false, error: message };
      }
    },
    [fetchUser]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
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
    signOut,
    refresh,
  };
}
