"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Send, X, Bot, Sparkles, User, Loader2, RotateCcw,
  Lightbulb, BookOpen, GraduationCap, Shield, Clock
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface GreetingPrompt {
  icon: React.ReactNode;
  text: string;
  sendText: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getRolePrompts(userCategory: string | undefined): GreetingPrompt[] {
  if (userCategory === "admin") {
    return [
      { icon: <Shield className="w-3.5 h-3.5" />, text: "How can I help you today?", sendText: "How can I help you today?" },
      { icon: <BookOpen className="w-3.5 h-3.5" />, text: "Show me today's school overview", sendText: "Show me today's school overview" },
      { icon: <GraduationCap className="w-3.5 h-3.5" />, text: "Any pending admissions or payments?", sendText: "Any pending admissions or payments?" },
    ];
  }
  if (userCategory === "staff") {
    return [
      { icon: <BookOpen className="w-3.5 h-3.5" />, text: "Need help planning today's lessons?", sendText: "Help me plan today's lessons" },
      { icon: <Clock className="w-3.5 h-3.5" />, text: "What's on my timetable today?", sendText: "What's on my timetable today?" },
      { icon: <GraduationCap className="w-3.5 h-3.5" />, text: "Help me create an assignment", sendText: "Help me create an assignment" },
    ];
  }
  if (userCategory === "student") {
    return [
      { icon: <Lightbulb className="w-3.5 h-3.5" />, text: "What did you learn today?", sendText: "What did you learn today?" },
      { icon: <BookOpen className="w-3.5 h-3.5" />, text: "Help me understand today's topic", sendText: "Help me understand today's topic" },
      { icon: <GraduationCap className="w-3.5 h-3.5" />, text: "Quiz me on what I studied", sendText: "Quiz me on what I studied" },
    ];
  }
  if (userCategory === "parent") {
    return [
      { icon: <GraduationCap className="w-3.5 h-3.5" />, text: "How is my child performing?", sendText: "How is my child performing?" },
      { icon: <BookOpen className="w-3.5 h-3.5" />, text: "What are the upcoming events?", sendText: "What are the upcoming school events?" },
    ];
  }
  return [
    { icon: <Sparkles className="w-3.5 h-3.5" />, text: "How can I help you today?", sendText: "How can I help you today?" },
  ];
}

export function JoyChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello! I'm Joy, your BDJA AI assistant. How can I help you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const greetingRef = useRef<HTMLDivElement>(null);

  const greeting = getGreeting();
  const prompts = getRolePrompts(user?.user_category);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Dismiss greeting when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        greetingRef.current &&
        !greetingRef.current.contains(e.target as Node) &&
        !chatContainerRef.current?.contains(e.target as Node)
      ) {
        setShowGreeting(false);
      }
    }
    if (showGreeting) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showGreeting]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);
      setShowGreeting(false);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || "";

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: [
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: "user", content: text },
            ],
            context: {
              user_category: user?.user_category,
              grade_level: user?.grade_level,
            },
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Joy AI error: ${response.status}`);
        }

        const data = await response.json();

        // Aevibron returns { content: string } or { message: { content: string } }
        let reply = "";
        if (typeof data.content === "string") {
          reply = data.content;
        } else if (data.message?.content) {
          reply = data.message.content;
        } else if (data.choices?.[0]?.message?.content) {
          reply = data.choices[0].message.content;
        } else if (typeof data === "string") {
          reply = data;
        } else {
          reply = JSON.stringify(data);
        }

        const assistantMsg: Message = {
          role: "assistant",
          content: reply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (error: any) {
        console.error("[JoyChat] Error:", error);
        const errorMsg: Message = {
          role: "assistant",
          content: `I'm sorry, I encountered an error: ${error.message}. Please try again.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        toast.error("Joy AI: " + error.message);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, user]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hello! I'm Joy, your BDJA AI assistant. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <>
      {/* Greeting Popup */}
      {showGreeting && !isOpen && (
        <div
          ref={greetingRef}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-80 cursor-pointer hover:shadow-xl transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-bdja-primary rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">
                  {greeting}, {user?.full_name?.split(" ")[0] || "there"}!
                </p>
                <p className="text-xs text-gray-500">I'm Joy, your AI assistant</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowGreeting(false);
              }}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="space-y-1.5">
            {prompts.map((prompt, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(true);
                  setTimeout(() => sendMessage(prompt.sendText), 300);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-700 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <span className="text-bdja-primary">{prompt.icon}</span>
                <span className="truncate">{prompt.text}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">Click anywhere to chat</p>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          ref={chatContainerRef}
          className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-bdja-primary px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              <div>
                <h3 className="font-semibold text-white text-sm">Joy AI</h3>
                <p className="text-white/70 text-[10px]">Powered by Aevibron</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearChat} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Clear chat">
                <RotateCcw className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 bg-bdja-primary rounded-full flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-bdja-primary text-white rounded-br-md"
                      : "bg-gray-100 text-gray-800 rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "");
                            return !inline && match ? (
                              <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-gray-200 px-1 py-0.5 rounded text-xs" {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 bg-bdja-primary rounded-full flex items-center justify-center shrink-0">
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Joy anything..."
                className="flex-1 h-10 text-sm"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()} className="h-10 px-3">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setShowGreeting(false);
          }}
          className="fixed bottom-4 right-4 z-40 w-14 h-14 bg-bdja-primary hover:bg-bdja-primary/90 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
        >
          <Sparkles className="w-6 h-6 text-white" />
        </button>
      )}
    </>
  );
}
