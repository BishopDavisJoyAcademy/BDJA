"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { setAuthToken, clearAuthToken, getDashboardPath } from "@/lib/auth-utils";
import { useAppStore } from "@/hooks/useStore";
import { UserRole } from "@/types";
import toast from "react-hot-toast";

export interface AuthUser {
  id: string;
  email: string | null;
  role: UserRole | null;
  full_name: string | null;
  password_changed: boolean;
  onboarding_completed: boolean;
  is_active: boolean;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(requireAuth: boolean = true): UseAuthReturn {
  const router = useRouter();
  const { user: storedUser, setUser, clearUser } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [user, setLocalUser] = useState<AuthUser | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        clearAuthToken();
        clearUser();
        setLocalUser(null);
        if (requireAuth) {
          router.replace("/login");
        }
        return;
      }

      if (session.access_token) {
        setAuthToken(session.access_token);
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, full_name, password_changed, onboarding_completed, is_active")
        .eq("id", session.user.id)
        .single();

      if (error || !profile) {
        console.error("[useAuth] Profile fetch failed:", error);
        clearAuthToken();
        clearUser();
        setLocalUser(null);
        if (requireAuth) {
          toast.error("Failed to load profile");
          router.replace("/login");
        }
        return;
      }

      if (profile.is_active === false) {
        clearAuthToken();
        await supabase.auth.signOut();
        clearUser();
        setLocalUser(null);
        toast.error("Your account has been suspended");
        router.replace("/login?error=suspended");
        return;
      }

      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email ?? null,
        role: (profile.role as UserRole) ?? null,
        full_name: profile.full_name ?? null,
        password_changed: profile.password_changed ?? false,
        onboarding_completed: profile.onboarding_completed ?? false,
        is_active: profile.is_active ?? true,
      };

      setLocalUser(authUser);
      setUser(authUser as any);

      if (!authUser.password_changed) {
        router.replace("/reset-password?first=true");
        return;
      }
      if (!authUser.onboarding_completed) {
        router.replace("/onboarding");
        return;
      }
    } catch (error) {
      console.error("[useAuth] Unexpected error:", error);
      clearAuthToken();
      clearUser();
      setLocalUser(null);
      if (requireAuth) {
        router.replace("/login");
      }
    }
  }, [router, requireAuth, clearUser, setUser]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!cancelled) {
        await refreshUser();
        if (!cancelled) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;

        if (event === "SIGNED_OUT") {
          clearAuthToken();
          clearUser();
          setLocalUser(null);
          setLoading(false);
          router.replace("/login");
          return;
        }

        if (session?.access_token) {
          setAuthToken(session.access_token);
        }

        await refreshUser();
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshUser, router, clearUser]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("[useAuth] Sign out error:", e);
    }
    clearAuthToken();
    clearUser();
    setLocalUser(null);
    router.replace("/login");
  }, [router, clearUser]);

  return { user, loading, signOut, refreshUser };
}
