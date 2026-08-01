"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import {
  MessageCircle, X, Send, Bot, User, Sparkles, Loader2,
  BookOpen, Calendar, ClipboardList, BarChart3, Lightbulb
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const TEACHING_PROMPTS = [
  { label: "Create Timetable", icon: Calendar, prompt: "Help me create a weekly timetable for my class. I teach [subject] to [grade level]." },
  { label: "Register Template", icon: ClipboardList, prompt: "Generate an attendance register template for my class with columns for present, absent, late, and notes." },
  { label: "Mark Sheet", icon: BarChart3, prompt: "Help me design a mark sheet with assessments for [subject] covering [topics]." },
  { label: "Lesson Plan", icon: BookOpen, prompt: "Create a lesson plan for [topic] suitable for [grade level] following CBC guidelines." },
  { label: "Teaching Tips", icon: Lightbulb, prompt: "Give me 5 effective teaching strategies for [subject] at [grade level]." },
];

export function JoyChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isTeacher = user?.role === "teacher" || user?.role === "principal" || user?.role === "super_admin";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: isTeacher
          ? `Hello ${user?.full_name?.split(" ")[0] || "there"}! I'm Joy, your AI teaching assistant. I can help you create timetables, design registers, build mark sheets, plan lessons, and more. How can I assist you today?`
          : `Hello! I'm Joy, your AI learning companion. Ask me anything about your studies, homework, or school topics!`,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, user, isTeacher]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setShowPrompts(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: isTeacher
                ? `You are Joy, an AI teaching assistant for Bishop Davis Joy Academy (BDJA). You help teachers with: creating timetables, designing student registers, building mark sheets, lesson planning, CBC curriculum guidance, teaching strategies, and classroom management. The school uses CBC (Competency Based Curriculum) for Playgroup through Grade 6. Be concise, practical, and professional. Always provide actionable, ready-to-use output when possible.`
                : `You are Joy, a friendly AI learning companion for Bishop Davis Joy Academy students. You help with homework, explain concepts, and encourage learning. The school motto is "Prayer, commitment and hard work for success." Be encouraging, clear, and age-appropriate.`,
            },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content },
          ],
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      const data = await response.json();
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || data.message || "I'm sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      toast.error(error.message || "Failed to get response");
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 bg-bdja-primary hover:bg-bdja-accent text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105"
        aria-label="Toggle Joy AI"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[9999] w-[380px] max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-slide-in-right" style={{ height: "min(600px, calc(100vh - 140px))" }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-bdja-primary to-bdja-accent p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">Joy AI</h3>
              <p className="text-white/70 text-xs">{isTeacher ? "Teaching Assistant" : "Learning Companion"}</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 bg-bdja-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-bdja-primary text-white rounded-br-md"
                    : "bg-white border border-gray-200 text-gray-700 rounded-bl-md shadow-sm"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 bg-bdja-secondary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 bg-bdja-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-bdja-primary" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />

            {/* Teaching Prompts */}
            {showPrompts && isTeacher && messages.length <= 1 && (
              <div className="pt-2">
                <p className="text-xs text-gray-400 mb-2 font-medium">Quick Actions:</p>
                <div className="grid grid-cols-2 gap-2">
                  {TEACHING_PROMPTS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => handlePromptClick(p.prompt)}
                      className="flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-bdja-primary hover:text-bdja-primary transition-all text-left"
                    >
                      <p.icon className="w-4 h-4 flex-shrink-0" />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100 bg-white">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isTeacher ? "Ask Joy about timetables, registers, marks..." : "Ask Joy anything..."}
                className="flex-1 text-sm"
                disabled={loading}
              />
              <Button type="submit" size="sm" disabled={loading || !input.trim()} className="bg-bdja-primary hover:bg-bdja-accent">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
