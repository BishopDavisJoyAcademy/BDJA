"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";
import { JoyUserPreferences, JoyTheme } from "@/types/joy";

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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/joy/preferences", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.preferences) {
        setPreferences(json.preferences);
      }
    } catch (err) {
      console.error("[useJoyPreferences] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<JoyUserPreferences>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
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
      }
    } catch (err) {
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
