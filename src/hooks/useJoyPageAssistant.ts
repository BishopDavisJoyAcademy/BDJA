"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { JoyPageAssistant } from "@/types/joy";

interface UseJoyPageAssistantReturn {
  assistant: JoyPageAssistant | null;
  loading: boolean;
  fetchAssistant: (route: string) => Promise<void>;
  logInteraction: (route: string, action: string, suggestion?: string, successful?: boolean) => Promise<void>;
}

export function useJoyPageAssistant(): UseJoyPageAssistantReturn {
  const [assistant, setAssistant] = useState<JoyPageAssistant | null>(null);
  const [loading, setLoading] = useState(false);

  const getHeaders = useCallback(async () => {
    const { data: { session: s } } = await import("@/lib/supabase-client").then((m) => m.supabase.auth.getSession());
    const headers: Record<string, string> = {};
    if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
    return headers;
  }, []);

  const fetchAssistant = useCallback(async (route: string) => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const url = new URL("/api/joy/page-assistants", window.location.origin);
      url.searchParams.set("route", route);

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        if (res.status === 404) {
          setAssistant(null);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setAssistant(json.assistant);
    } catch (err) {
      console.error("[useJoyPageAssistant] Error:", getErrorMessage(err));
      setAssistant(null);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const logInteraction = useCallback(async (
    route: string,
    action: string,
    suggestion?: string,
    successful: boolean = true
  ) => {
    try {
      const headers = await getHeaders();
      await fetch("/api/joy/page-interactions", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ page_route: route, action_taken: action, assistant_suggestion: suggestion, successful }),
      });
    } catch {
      // Silently fail — analytics should not block UX
    }
  }, [getHeaders]);

  return { assistant, loading, fetchAssistant, logInteraction };
}
