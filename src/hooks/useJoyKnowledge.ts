"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { JoyKnowledgeBase } from "@/types/joy";

interface KnowledgeFormData {
  key: string;
  content: string;
  category: JoyKnowledgeBase["category"];
  is_public: boolean;
}

interface UseJoyKnowledgeReturn {
  knowledge: JoyKnowledgeBase[];
  loading: boolean;
  fetchKnowledge: (category?: string) => Promise<void>;
  saveKnowledge: (data: KnowledgeFormData) => Promise<JoyKnowledgeBase | null>;
  deleteKnowledge: (key: string) => Promise<boolean>;
}

export function useJoyKnowledge(): UseJoyKnowledgeReturn {
  const [knowledge, setKnowledge] = useState<JoyKnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);

  const getHeaders = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
    return headers;
  }, []);

  const fetchKnowledge = useCallback(async (category?: string) => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const url = new URL("/api/joy/knowledge", window.location.origin);
      if (category) url.searchParams.set("category", category);

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setKnowledge(json.knowledge || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const saveKnowledge = useCallback(async (data: KnowledgeFormData) => {
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/joy/knowledge", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      toast.success(`Saved "${data.key}" successfully`);
      return json.knowledge as JoyKnowledgeBase;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return null;
    }
  }, [getHeaders]);

  const deleteKnowledge = useCallback(async (key: string) => {
    try {
      const headers = await getHeaders();
      const url = new URL("/api/joy/knowledge", window.location.origin);
      url.searchParams.set("key", key);

      const res = await fetch(url.toString(), {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`Deleted "${key}" successfully`);
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return false;
    }
  }, [getHeaders]);

  return { knowledge, loading, fetchKnowledge, saveKnowledge, deleteKnowledge };
}
