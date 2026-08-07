"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types";

export type UserCategory = "student" | "parent" | "staff" | "admin";

export interface AuthUser {
  id: string;
  email: string | null;
  role: UserRole;
  user_category: UserCategory;
  full_name: string;
  password_changed: boolean;
  onboarding_completed: boolean;
  is_active: boolean;
  campus_id: string | null;
  department?: string | null;
  designation?: string | null;
  admission_number?: string | null;
  grade_level?: string | null;
  permissions?: string[];
}

interface AuthError {
  type: string;
  message: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: AuthError | null;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const fetchUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setState({ user: null, loading: false, error: null });
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          await supabase.auth.signOut();
          setState({ user: null, loading: false, error: { type: "session_expired", message: "Session expired" } });
          return;
        }
        throw new Error(errorData.error || "Failed to load user data");
      }

      const data = await response.json();
      const profile = data.profile || data.user;

      if (!profile) {
        throw new Error("Profile not found");
      }

      if (profile.is_active === false) {
        await supabase.auth.signOut();
        setState({ user: null, loading: false, error: { type: "account_suspended", message: "Account suspended" } });
        return;
      }

      const role = profile.role || "student";
      // CORRECT fallback: principal/super_admin → admin
      let userCategory: UserCategory = profile.user_category;
      if (!userCategory) {
        if (role === "student") userCategory = "student";
        else if (role === "parent") userCategory = "parent";
        else if (role === "principal" || role === "super_admin") userCategory = "admin";
        else userCategory = "staff";
      }

      const authUser: AuthUser = {
        id: profile.id,
        email: profile.email,
        role: role as UserRole,
        user_category: userCategory,
        full_name: profile.full_name || "User",
        password_changed: profile.password_changed ?? false,
        onboarding_completed: profile.onboarding_completed ?? false,
        is_active: profile.is_active ?? true,
        campus_id: profile.campus_id || null,
        department: profile.department || null,
        designation: profile.designation || null,
        admission_number: profile.admission_number || null,
        grade_level: profile.grade_level || null,
        permissions: data.permissions || [],
      };

      setState({ user: authUser, loading: false, error: null });
    } catch (error: any) {
      console.error("[useAuth] Error:", error);
      setState({ user: null, loading: false, error: { type: "unknown", message: error.message } });
    }
  }, []);

  useEffect(() => {
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchUser();
      } else if (event === "SIGNED_OUT") {
        setState({ user: null, loading: false, error: null });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUser]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, loading: false, error: null });
    router.push("/login");
  }, [router]);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signOut,
    refresh: fetchUser,
  };
}
