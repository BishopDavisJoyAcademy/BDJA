"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

export function useInactivityLogout() {
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const logout = async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      await supabase.auth.signOut().catch(() => {});
      window.location.href = "/login";
    };

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(logout, INACTIVITY_TIMEOUT_MS);
    };

    resetTimer();
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.getUser().then(({ data: { user }, error }) => {
          if (error || !user) window.location.href = "/login";
        });
        resetTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
}
