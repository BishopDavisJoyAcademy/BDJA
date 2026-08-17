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
        .select("id, email, full_name, role, user_category, campus_id, avatar_url, is_active, password_changed")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile || !profile.is_active) {
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
        .eq("profile_id", profile.id);

      const permissions = (permData || [])
        .map((p: { permissions: { key: string } | null }) => p.permissions?.key)
        .filter((k): k is string => Boolean(k));

      setState({
        user: { ...profile, must_change_password: profile.password_changed, permissions },
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
