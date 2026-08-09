"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * useInactivityLogout
 *
 * Tracks user activity (mouse, keyboard, touch, scroll).
 * If no activity for 10 minutes, calls supabase.auth.signOut()
 * and reloads the page to clear all state.
 *
 * This provides the security behavior the user wants:
 * - Active browsing = session stays alive
 * - Idle for 10 min = auto-logout
 * - Close tab for 10 min = when you return, session is gone
 */
export function useInactivityLogout() {
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const logout = async () => {
      console.log("[inactivity] Logging out due to inactivity");
      await supabase.auth.signOut().catch(() => {});
      window.location.href = "/login";
    };

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(logout, INACTIVITY_TIMEOUT_MS);
    };

    // Start timer
    resetTimer();

    // Listen for activity
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    // Also check on visibility change (tab becomes active after being hidden)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        // If tab was hidden for a while, check if session still exists
        supabase.auth.getUser().then(({ data: { user }, error: userError }) => {
          if (userError || !user) {
            window.location.href = "/login";
          }
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
