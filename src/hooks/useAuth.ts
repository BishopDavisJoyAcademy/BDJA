"use client";

import { useEffect, useState, useCallback } from "react";
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
}

export interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

async function fetchProfile(token: string) {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to load profile");
  }
  return res.json();
}

export function useAuth(requireAuth: boolean = true): UseAuthReturn {
  const router = useRouter();
  const { setUser, clearUser } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [user, setLocalUser] = useState<AuthUser | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        clearUser();
        setLocalUser(null);
        if (requireAuth) router.replace("/login");
        return;
      }

      const { profile } = await fetchProfile(session.access_token);

      if (profile.is_active === false) {
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
        role: (profile.role as UserRole) || "student",
        full_name: profile.full_name || "User",
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
    } catch (error: any) {
      console.error("[useAuth] Error:", error);
      clearUser();
      setLocalUser(null);
      if (requireAuth) router.replace("/login");
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
          clearUser();
          setLocalUser(null);
          setLoading(false);
          router.replace("/login");
          return;
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
    try { await supabase.auth.signOut(); } catch {}
    clearUser();
    setLocalUser(null);
    router.replace("/login");
  }, [router, clearUser]);

  return { user, loading, signOut, refreshUser };
}
