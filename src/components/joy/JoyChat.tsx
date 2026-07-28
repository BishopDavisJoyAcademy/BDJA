"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { chatWithJoy } from "@/lib/aevibron";
import { JoyMessage } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { X, Send, Sparkles, Mic, MicOff, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function JoyChat() {
  const { joyOpen, setJoyOpen } = useAppStore();
  const { user } = useAuth();
  const [messages, setMessages] = useState<JoyMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (joyOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [joyOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: JoyMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const context = user
        ? {
            user_name: user.full_name,
            user_role: user.role,
            campus_id: user.campus_id,
          }
        : {};

      const response = await chatWithJoy([...messages, userMsg], context);

      const joyMsg: JoyMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, joyMsg]);
    } catch {
      const errorMsg: JoyMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input is not supported in your browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-KE";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + " " + transcript);
    };

    recognition.start();
  };

  if (!joyOpen) {
    return (
      <button
        onClick={() => setJoyOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-bdja-secondary rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform group"
      >
        <Sparkles className="w-6 h-6 text-white" />
        <span className="absolute -top-8 right-0 bg-bdja-dark text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Ask Joy
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-bdja-primary to-bdja-accent rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-bdja-secondary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Joy</h3>
            <p className="text-[10px] text-white/70">Your BDJA Assistant</p>
          </div>
        </div>
        <button onClick={() => setJoyOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-bdja-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-bdja-secondary" />
            </div>
            <p className="text-sm text-gray-500">Hi! I'm Joy. How can I help you today?</p>
            <div className="mt-4 space-y-2">
              {["How do I check my timetable?", "What assignments are due?", "Tell me about CBC grading"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="block w-full text-left text-xs text-bdja-primary bg-bdja-primary/5 hover:bg-bdja-primary/10 px-3 py-2 rounded-lg transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 bg-bdja-secondary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                msg.role === "user"
                  ? "bg-bdja-primary text-white rounded-br-none"
                  : "bg-gray-100 text-gray-800 rounded-bl-none"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 bg-bdja-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 bg-bdja-secondary rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3 h-3 text-white animate-pulse" />
            </div>
            <div className="bg-gray-100 rounded-xl px-3 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex gap-2">
          <button
            onClick={toggleVoice}
            className={`p-2 rounded-lg transition-colors ${isListening ? "bg-red-100 text-red-600" : "hover:bg-gray-100 text-gray-500"}`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Joy anything..."
            className="flex-1 text-sm"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
