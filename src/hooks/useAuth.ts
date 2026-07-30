"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types";
import { useAppStore } from "./useStore";

export function useAuth() {
  const { user, setUser, clearUser } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (!error && profile) {
            setUser(profile as Profile);
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setUser(profile as Profile);
      } else if (event === "SIGNED_OUT") {
        clearUser();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setUser, clearUser]);

  const signOut = async () => {
    await supabase.auth.signOut();
    clearUser();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return { user, loading, signOut };
}
