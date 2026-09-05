"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { JoyUserPreferences, JoyTheme } from "@/types/joy";
import { toast } from "sonner";

const DEFAULT_PREFS: JoyUserPreferences = {
  id: "",
  user_id: "",
  theme: "light",
  personality_mode: "auto",
  language_preference: "auto",
  show_timestamps: true,
  enable_sound: true,
  enable_streaming: true,
  font_size: "medium",
  created_at: "",
  updated_at: "",
};

export function useJoyPreferences() {
  const [preferences, setPreferences] = useState<JoyUserPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const res = await fetch("/api/joy/preferences", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.preferences) {
        setPreferences(json.preferences);
      } else if (json.error) {
        console.error("[useJoyPreferences] fetch error:", json.error);
      }
    } catch (err: unknown) {
      console.error("[useJoyPreferences] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<JoyUserPreferences>) => {
    // Optimistic update for instant UI feedback (theme, font size, etc.)
    setPreferences((prev) => ({ ...prev, ...updates }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const res = await fetch("/api/joy/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.preferences) {
        setPreferences(json.preferences);
      } else if (json.error) {
        toast.error(json.error);
        console.error("[useJoyPreferences] update error:", json.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update preferences";
      toast.error(msg);
      console.error("[useJoyPreferences] update error:", err);
    }
  }, []);

  const setTheme = useCallback((theme: JoyTheme) => {
    updatePreferences({ theme });
  }, [updatePreferences]);

  const setPersonality = useCallback((mode: JoyUserPreferences["personality_mode"]) => {
    updatePreferences({ personality_mode: mode });
  }, [updatePreferences]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    updatePreferences,
    setTheme,
    setPersonality,
    fetchPreferences,
  };
}
