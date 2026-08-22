"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { UserRole, UserCategory } from "@/types";
import { getErrorMessage } from "@/lib/errors";

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
  avatar_url?: string | null;
  permissions?: string[];
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: { type: string; message: string } | null;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  const fetchUser = useCallback(async () => {
    try {
      // Use getUser() for secure validation
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        setState({ user: null, loading: false, error: null });
        return;
      }

      // Get session for the token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setState({ user: null, loading: false, error: { type: "session_expired", message: "Session expired" } });
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await supabase.auth.signOut();
          setState({ user: null, loading: false, error: { type: "session_expired", message: "Session expired" } });
          return;
        }
        throw new Error("Failed to load user data");
      }

      const data = await response.json();
      const profile = data.user;
      if (!profile) throw new Error("Profile not found");

      if (profile.is_active === false) {
        await supabase.auth.signOut();
        setState({ user: null, loading: false, error: { type: "account_suspended", message: "Account suspended" } });
        return;
      }

      const rawRole = profile.role || "student";
      const role: UserRole = ["student", "parent", "staff", "admin"].includes(rawRole)
        ? rawRole
        : ["principal", "super_admin"].includes(rawRole) ? "admin" : "staff";

      let userCategory: UserCategory = profile.user_category;
      if (!userCategory || !["student", "parent", "staff", "admin"].includes(userCategory)) {
        userCategory = role === "student" ? "student" : role === "parent" ? "parent" : role === "admin" ? "admin" : "staff";
      }

      setState({
        user: {
          id: profile.id,
          email: profile.email,
          role,
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
        },
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      console.error("[useAuth] Error:", error);
      setState({ user: null, loading: false, error: { type: "unknown", message: getErrorMessage(error) } });
    }
  }, []);

  useEffect(() => {
    fetchUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        fetchUser();
      } else if (event === "SIGNED_OUT") {
        setState({ user: null, loading: false, error: null });
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchUser]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await supabase.auth.signOut({ scope: "global" });
    setState({ user: null, loading: false, error: null });
    router.push("/login");
  }, [router]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error: string | null; mustChangePassword?: boolean; redirectTo?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return { success: false, error: error?.message || "Invalid credentials" };
      }
      await fetchUser();
      return { success: true, error: null };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) || "Login failed" };
    }
  }, [fetchUser]);

  const signInStudent = useCallback(async (admissionNumber: string, pin: string): Promise<{ success: boolean; error: string | null; mustChangePassword?: boolean; redirectTo?: string }> => {
    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admission_number: admissionNumber, pin }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Invalid admission number or PIN" };
      }
      if (data.session?.access_token && data.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      await fetchUser();
      return { success: true, error: null };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) || "Login failed" };
    }
  }, [fetchUser]);

  return { user: state.user, loading: state.loading, error: state.error, signIn, signInStudent, signOut, refresh: fetchUser };
}
