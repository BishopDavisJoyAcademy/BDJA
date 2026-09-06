"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  MessageCircle, X, Send, Sparkles, Bot, User, Loader2,
  ChevronDown, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE = `Hello! I am Joy, the AI assistant for Bishop Davis Joy Academy.\n\nI can help you with:
• School information and policies
• Admissions guidance
• General FAQs
• Public announcements

What would you like to know?`;

export function JoyPublicChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/joy/public-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json().catch(() => ({ error: "Invalid response" }));

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply || "I'm not sure how to answer that. Please contact the school office for assistance.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      toast.error(getErrorMessage(err));
      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again in a moment, or contact the school office directly.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Ask Joy Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full shadow-2xl border border-[#D4AF37]/30 bg-slate-900/95 backdrop-blur-xl hover:bg-slate-800/95 transition-colors group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-[#D4AF37] rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
              <Sparkles className="w-5 h-5 text-[#D4AF37] relative z-10" />
            </div>
            <span className="text-sm font-semibold text-white">Ask Joy</span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] flex flex-col rounded-2xl shadow-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Joy</h3>
                  <p className="text-[10px] text-slate-400">BDJA AI Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMessages([
                    {
                      id: "welcome",
                      role: "assistant",
                      content: WELCOME_MESSAGE,
                      timestamp: new Date(),
                    },
                  ])}
                  className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-[#D4AF37] transition-colors"
                  title="Reset chat"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-2.5",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-[#D4AF37]/15 text-white border border-[#D4AF37]/20 rounded-br-md"
                        : "bg-slate-800/60 text-slate-200 border border-slate-700/40 rounded-bl-md"
                    )}
                  >
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-6 h-6 rounded-full bg-slate-700/50 border border-slate-600/30 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3 h-3 text-slate-400" />
                    </div>
                  )}
                </motion.div>
              ))}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2.5"
                >
                  <div className="w-6 h-6 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 text-[#D4AF37] animate-pulse" />
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                    <Loader2 className="w-4 h-4 text-[#D4AF37] animate-spin" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/40">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Joy anything about BDJA..."
                  rows={1}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 placeholder:text-slate-500 max-h-24"
                  style={{ minHeight: "40px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className={cn(
                    "p-2.5 rounded-xl transition-all shrink-0",
                    input.trim() && !loading
                      ? "bg-[#D4AF37] hover:bg-[#E8C84A] text-slate-900"
                      : "bg-slate-700/40 text-slate-500 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-600 mt-2 text-center">
                Joy only has access to public school information. For private data, please log in.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
