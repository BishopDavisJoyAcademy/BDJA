"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { JoyConversation, JoyMessage } from "@/types/joy";

// In-memory message cache to prevent empty conversations when switching
const messageCache = new Map<string, JoyMessage[]>();

export function useJoyConversations() {
  const [conversations, setConversations] = useState<JoyConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<JoyConversation | null>(null);
  const [messages, setMessages] = useState<JoyMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchConversations = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { isFetchingRef.current = false; return; }
    try {
      const res = await fetch("/api/conversations", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.conversations) {
        setConversations(json.conversations);
        // Pre-load messages for all conversations into cache
        for (const conv of json.conversations) {
          if (!messageCache.has(conv.id)) {
            const { data } = await supabase
              .from("conversation_messages")
              .select("*")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: true });
            if (data) {
              messageCache.set(conv.id, data);
            }
          }
        }
      }
    } catch (err) {
      console.error("[useJoyConversations] fetch error:", err);
    } finally {
      isFetchingRef.current = false;
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
        messageCache.set(json.conversation.id, []);
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
      // First check cache
      const cached = messageCache.get(conversationId);
      if (cached) {
        setMessages(cached);
      }

      // Then fetch fresh from DB
      const { data, error } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      const msgs = data || [];
      setMessages(msgs);
      messageCache.set(conversationId, msgs);
    } catch (err) {
      console.error("[useJoyConversations] load messages error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectConversation = useCallback(async (conversation: JoyConversation) => {
    setCurrentConversation(conversation);
    // Immediately show cached messages if available
    const cached = messageCache.get(conversation.id);
    if (cached) {
      setMessages(cached);
    }
    // Then load fresh
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
      messageCache.delete(id);
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("[useJoyConversations] delete error:", err);
    }
  }, [currentConversation]);

  // Persist messages to cache whenever they change
  useEffect(() => {
    if (currentConversation?.id && messages.length > 0) {
      messageCache.set(currentConversation.id, messages);
    }
  }, [messages, currentConversation]);

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
