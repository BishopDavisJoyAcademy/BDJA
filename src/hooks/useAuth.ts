"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types";
import { useAppStore } from "./useStore";

export function useAuth() {
  const { user, setUser } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setUser(profile as Profile);
      }
      setLoading(false);
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setUser(profile as Profile);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [setUser]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/login";
  };

  return { user, loading, signOut };
}
