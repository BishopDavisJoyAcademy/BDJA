"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";
import { JoyConversation, JoyMessage } from "@/types/joy";

export function useJoyConversations() {
  const [conversations, setConversations] = useState<JoyConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<JoyConversation | null>(null);
  const [messages, setMessages] = useState<JoyMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch("/api/conversations", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.conversations) setConversations(json.conversations);
    } catch (err) {
      console.error("[useJoyConversations] fetch error:", err);
    }
  }, []);

  const createConversation = useCallback(async (title?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ title: title || "New Chat" }),
      });
      const json = await res.json();
      if (json.conversation) {
        setConversations((prev) => [json.conversation, ...prev]);
        setCurrentConversation(json.conversation);
        setMessages([]);
        return json.conversation;
      }
    } catch (err) {
      console.error("[useJoyConversations] create error:", err);
    }
    return null;
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("[useJoyConversations] load messages error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectConversation = useCallback(async (conversation: JoyConversation) => {
    setCurrentConversation(conversation);
    await loadMessages(conversation.id);
  }, [loadMessages]);

  const updateConversation = useCallback(async (id: string, updates: Partial<JoyConversation>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch("/api/conversations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id, ...updates }),
      });
      const json = await res.json();
      if (json.conversation) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? json.conversation : c))
        );
        if (currentConversation?.id === id) {
          setCurrentConversation(json.conversation);
        }
      }
    } catch (err) {
      console.error("[useJoyConversations] update error:", err);
    }
  }, [currentConversation]);

  const deleteConversation = useCallback(async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      await fetch(`/api/conversations?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("[useJoyConversations] delete error:", err);
    }
  }, [currentConversation]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    fetchConversations,
    createConversation,
    selectConversation,
    updateConversation,
    deleteConversation,
    loadMessages,
    setMessages,
  };
}
