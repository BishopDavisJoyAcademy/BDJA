"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, X, RotateCcw, Send, Maximize2, Minimize2, MessageSquarePlus,
  ChevronLeft, Pin, Trash2, Settings, Mic, MicOff, Plus, Download,
  Copy, Check, ThumbsUp, ThumbsDown, Sparkles, BookOpen, Calendar,
  GraduationCap, Lightbulb, Volume2, VolumeX, Keyboard, ImagePlus,
  Link2, PenTool, BarChart3, ScanLine, Camera, FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useJoyConversations } from "@/hooks/useJoyConversations";
import { useJoyPreferences } from "@/hooks/useJoyPreferences";
import { useAttachments } from "@/hooks/useAttachments";
import { getThemeConfig, THEME_LIST } from "@/lib/joy-themes";
import { JoyMessage, JoyConversation, JoyTheme } from "@/types/joy";
import { AttachmentFile } from "@/types/attachments";
import { BottomSheet } from "./BottomSheet";
import { AttachmentChip } from "./AttachmentChip";
import { AttachmentPreview } from "./AttachmentPreview";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface GreetingPrompt {
  icon: React.ReactNode;
  text: string;
  sendText: string;
}

export function JoyChat() {
  const { user } = useAuth();
  const {
    conversations, currentConversation, messages, loading: convLoading,
    createConversation, selectConversation, updateConversation, deleteConversation, setMessages,
  } = useJoyConversations();

  const { preferences, updatePreferences } = useJoyPreferences();
  const theme = getThemeConfig(preferences.theme as JoyTheme);

  const {
    attachments, showBottomSheet, setShowBottomSheet, previewAttachment, setPreviewAttachment,
    addFiles, addLink, addPoll, addWhiteboard, updateAttachment, removeAttachment,
    clearAttachments, uploadAll, formatFileSize,
  } = useAttachments();

  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, "like" | "dislike">>({});
  const [isListening, setIsListening] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showPollInput, setShowPollInput] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const docsInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  const userName = user?.full_name || user?.email?.split("@")[0] || "there";
  const userCategory = user?.user_category || "student";

  // Greeting
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    let timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    if (userCategory === "student") return `${timeGreeting}, ${userName}! Ready to learn something amazing today? 📚`;
    if (userCategory === "parent") return `${timeGreeting}, ${userName}! How can I help you with your child's progress today?`;
    if (userCategory === "staff") return `${timeGreeting}, ${userName}! What can I help you with today?`;
    if (userCategory === "admin") return `${timeGreeting}, ${userName}! Ready to manage BDJA?`;
    return `${timeGreeting}, ${userName}! How can I help you today?`;
  }, [userName, userCategory]);

  const getSmartSuggestions = useCallback((): GreetingPrompt[] => {
    const common: GreetingPrompt[] = [
      { icon: <Sparkles className="w-4 h-4" />, text: "What can you help me with?", sendText: "What can you help me with?" },
      { icon: <Lightbulb className="w-4 h-4" />, text: "Tell me about BDJA", sendText: "Tell me about Bishop Davis Joy Academy" },
    ];
    if (userCategory === "student") return [
      { icon: <BookOpen className="w-4 h-4" />, text: "Help with homework", sendText: "I need help with my homework" },
      { icon: <Calendar className="w-4 h-4" />, text: "What's my timetable?", sendText: "What's my timetable for today?" },
      { icon: <GraduationCap className="w-4 h-4" />, text: "How are my grades?", sendText: "How are my grades looking?" },
      ...common,
    ];
    if (userCategory === "parent") return [
      { icon: <GraduationCap className="w-4 h-4" />, text: "How is my child doing?", sendText: "How is my child performing academically?" },
      { icon: <Calendar className="w-4 h-4" />, text: "Upcoming events", sendText: "What upcoming events are there?" },
      { icon: <BookOpen className="w-4 h-4" />, text: "Fee balance", sendText: "What is my fee balance?" },
      ...common,
    ];
    if (userCategory === "staff") return [
      { icon: <Calendar className="w-4 h-4" />, text: "My teaching schedule", sendText: "What is my teaching schedule?" },
      { icon: <BookOpen className="w-4 h-4" />, text: "Create assignment", sendText: "Help me create a new assignment" },
      { icon: <GraduationCap className="w-4 h-4" />, text: "Enter marks", sendText: "Help me enter student marks" },
      ...common,
    ];
    if (userCategory === "admin") return [
      { icon: <Calendar className="w-4 h-4" />, text: "Manage timetable", sendText: "Help me manage the school timetable" },
      { icon: <BookOpen className="w-4 h-4" />, text: "CMS pages", sendText: "Help me manage CMS pages" },
      { icon: <GraduationCap className="w-4 h-4" />, text: "Student analytics", sendText: "Show me student performance analytics" },
      ...common,
    ];
    return common;
  }, [userCategory]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showLinkInput) { setShowLinkInput(false); return; }
        if (showPollInput) { setShowPollInput(false); return; }
        if (showWhiteboard) { setShowWhiteboard(false); return; }
        if (previewAttachment) { setPreviewAttachment(null); return; }
        if (isFullScreen) { setIsFullScreen(false); return; }
        if (showSettings) { setShowSettings(false); return; }
        if (showSidebar) { setShowSidebar(false); return; }
        if (isOpen) { setIsOpen(false); return; }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setIsOpen((p) => !p); }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") { e.preventDefault(); setShowShortcuts(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") { e.preventDefault(); handleNewChat(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") { e.preventDefault(); setIsFullScreen((p) => !p); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen, isOpen, showSettings, showSidebar, previewAttachment, showLinkInput, showPollInput, showWhiteboard]);

  // Voice input
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
        setInput(transcript);
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) { toast.error("Voice input not supported"); return; }
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  // Drag & drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files, "documents");
  };

  // Clipboard paste
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) addFiles({ 0: file, length: 1, item: () => file } as any, "photos");
      }
    }
  };

  // Attachment handlers
  const handleCamera = () => {
    if (cameraInputRef.current) { cameraInputRef.current.value = ""; cameraInputRef.current.click(); }
  };
  const handlePhotos = () => {
    if (photosInputRef.current) { photosInputRef.current.value = ""; photosInputRef.current.click(); }
  };
  const handleDocuments = () => {
    if (docsInputRef.current) { docsInputRef.current.value = ""; docsInputRef.current.click(); }
  };
  const handleScanner = () => {
    if (scannerInputRef.current) { scannerInputRef.current.value = ""; scannerInputRef.current.click(); }
  };
  const handleVoice = () => { toggleVoice(); };
  const handleWhiteboard = () => { setShowWhiteboard(true); };
  const handlePoll = () => { setShowPollInput(true); };
  const handleLink = () => { setShowLinkInput(true); };

  const submitLink = () => {
    if (!linkUrl.trim()) return;
    addLink(linkUrl.trim());
    setLinkUrl("");
    setShowLinkInput(false);
  };

  const submitPoll = () => {
    if (!pollQuestion.trim() || pollOptions.some((o) => !o.trim())) return;
    addPoll({
      question: pollQuestion.trim(),
      options: pollOptions.filter((o) => o.trim()).map((o, i) => ({ id: `opt-${i}`, label: o.trim(), votes: 0 })),
      allowMultiple: false,
    });
    setPollQuestion("");
    setPollOptions(["", ""]);
    setShowPollInput(false);
  };

  const handleNewChat = async () => {
    await createConversation();
    setShowSidebar(false);
    setMessages([]);
    setStreamingText("");
    setSuggestions([]);
    clearAttachments();
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText && attachments.length === 0) return;
    if (isLoading || isStreaming) return;

    let conversationId = currentConversation?.id;
    if (!conversationId) {
      const conv = await createConversation(messageText.slice(0, 30) || "New Chat");
      if (!conv) return;
      conversationId = conv.id;
    }
    if (!conversationId) return;

    const userMsg: JoyMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "user",
      content: messageText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setStreamingText("");
    setSuggestions([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Upload attachments
      const uploadedAttachments = await uploadAll();
      const attachmentUrls = uploadedAttachments.filter((a) => a.url).map((a) => ({
        name: a.name,
        type: a.type,
        url: a.url,
        metadata: a.metadata,
      }));

      const chatMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      if (preferences.enable_streaming) {
        setIsStreaming(true);
        let fullText = "";

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: chatMessages,
            conversationId,
            stream: true,
            attachments: attachmentUrls,
          }),
        });

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.chunk) { fullText += parsed.chunk; setStreamingText(fullText); }
              } catch { /* ignore */ }
            }
          }
        }

        setIsStreaming(false);
        if (fullText) {
          const assistantMsg: JoyMessage = {
            id: crypto.randomUUID(),
            conversation_id: conversationId,
            role: "assistant",
            content: fullText,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          generateSuggestions(fullText);
        }
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: chatMessages,
            conversationId,
            stream: false,
            attachments: attachmentUrls,
          }),
        });

        const json = await res.json();
        if (json.error) throw new Error(json.error);

        const assistantMsg: JoyMessage = {
          id: crypto.randomUUID(),
          conversation_id: conversationId,
          role: "assistant",
          content: json.reply || "I'm sorry, I couldn't process that.",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        generateSuggestions(json.reply);

        if (json.actions?.length > 0) {
          for (const action of json.actions) {
            if (action.type === "navigate" && action.target) {
              toast.success(`Navigating to ${action.target}...`);
              setTimeout(() => { window.location.href = action.target; }, 1000);
            }
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingText("");
      clearAttachments();
    }
  };

  const generateSuggestions = (lastResponse: string) => {
    const lower = lastResponse.toLowerCase();
    const newSuggestions: string[] = [];
    if (lower.includes("fraction") || lower.includes("math")) { newSuggestions.push("Can you give me more examples?", "Quiz me on this topic"); }
    else if (lower.includes("assignment") || lower.includes("homework")) { newSuggestions.push("When is this due?", "Help me plan my work"); }
    else if (lower.includes("grade") || lower.includes("mark")) { newSuggestions.push("How can I improve?", "What topics should I focus on?"); }
    else if (lower.includes("timetable") || lower.includes("schedule")) { newSuggestions.push("What's my next class?", "Show me the full week"); }
    else { newSuggestions.push("Tell me more", "Can you explain that differently?", "Give me an example"); }
    setSuggestions(newSuggestions.slice(0, 3));
  };

  const copyToClipboard = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }
    catch { toast.error("Failed to copy"); }
  };

  const exportChat = () => {
    const allMessages = messages.map((m) => `${m.role === "user" ? userName : "Joy"}: ${m.content}`).join("\n\n");
    const blob = new Blob([`Joy AI Chat Export\nDate: ${new Date().toLocaleString()}\n\n${allMessages}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `joy-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat exported!");
  };

  const handleReaction = (messageId: string, type: "like" | "dislike") => {
    setReactions((prev) => ({ ...prev, [messageId]: type }));
    toast.success(type === "like" ? "Thanks for the feedback!" : "We'll improve!");
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const fontSizeClass = preferences.font_size === "small" ? "text-xs" : preferences.font_size === "large" ? "text-base" : "text-sm";

  // Thinking indicator component
  const ThinkingIndicator = () => (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: theme.primary + "15" }}>
        <img src="/joy-logo.png" alt="Joy" className="w-5 h-5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <Bot className="w-4 h-4" style={{ color: theme.primary }} />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-md" style={{ background: theme.assistantBubble }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium" style={{ color: theme.textMuted }}>Joy is thinking</span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.primary, animationDelay: "0ms", animationDuration: "1.2s" }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.primary, animationDelay: "0.3s", animationDuration: "1.2s" }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.primary, animationDelay: "0.6s", animationDuration: "1.2s" }} />
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform overflow-hidden"
        style={{ background: theme.primary, boxShadow: theme.shadow }}
        aria-label="Open Joy AI"
      >
        <img src="/joy-logo.png" alt="Joy" className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
        <Bot className="w-7 h-7 hidden" style={{ color: theme.textInverse }} />
      </button>
    );
  }

  return (
    <div
      className={cn("fixed z-50 flex flex-col overflow-hidden transition-all duration-300", isFullScreen ? "inset-0 rounded-none" : "bottom-4 right-4 w-[400px] h-[600px] rounded-2xl shadow-2xl")}
      style={{ background: theme.background, boxShadow: isFullScreen ? "none" : theme.shadow, border: `1px solid ${theme.border}` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-[55] flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
          <div className="px-6 py-4 rounded-2xl border-2 border-dashed" style={{ background: theme.surface, borderColor: theme.primary }}>
            <p className="text-lg font-semibold" style={{ color: theme.primary }}>Drop files here</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: theme.headerGradient }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
            <img src="/joy-logo.png" alt="Joy" className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
            <Bot className="w-5 h-5 text-white hidden" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Joy AI</h3>
            <p className="text-xs text-white/70">Powered by Aevibron</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSidebar((p) => !p)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Conversations">
            <MessageSquarePlus className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => setShowSettings((p) => !p)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Settings">
            <Settings className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => setIsFullScreen((p) => !p)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title={isFullScreen ? "Exit Full Screen" : "Full Screen"}>
            {isFullScreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Close">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="absolute left-0 top-[57px] bottom-0 w-64 z-20 flex flex-col" style={{ background: theme.surface, borderRight: `1px solid ${theme.border}` }}>
          <div className="p-3 border-b" style={{ borderColor: theme.border }}>
            <button onClick={handleNewChat} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: theme.primary, color: theme.textInverse }}>
              <MessageSquarePlus className="w-4 h-4" /> New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => { selectConversation(conv); setShowSidebar(false); }}
                className={cn("group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors", currentConversation?.id === conv.id ? "font-medium" : "")}
                style={{ background: currentConversation?.id === conv.id ? theme.primaryLight + "20" : "transparent", color: currentConversation?.id === conv.id ? theme.primary : theme.text }}
              >
                <ChevronLeft className="w-3 h-3 shrink-0 opacity-50" />
                <span className="truncate text-sm flex-1">{conv.title}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); updateConversation(conv.id, { is_pinned: !conv.is_pinned }); }} className="p-1 rounded hover:bg-black/5">
                    <Pin className={cn("w-3 h-3", conv.is_pinned ? "text-yellow-500 fill-yellow-500" : "opacity-50")} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="p-1 rounded hover:bg-red-100">
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
            {conversations.length === 0 && <p className="text-center text-xs py-4" style={{ color: theme.textMuted }}>No conversations yet</p>}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute right-0 top-[57px] bottom-0 w-72 z-20 overflow-y-auto p-4" style={{ background: theme.surface, borderLeft: `1px solid ${theme.border}` }}>
          <h4 className="font-semibold mb-4" style={{ color: theme.text }}>Joy Settings</h4>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: theme.textMuted }}>Theme</label>
              <div className="grid grid-cols-4 gap-2">
                {THEME_LIST.map((t) => (
                  <button key={t.key} onClick={() => updatePreferences({ theme: t.key })} className={cn("w-8 h-8 rounded-full border-2 transition-transform hover:scale-110", preferences.theme === t.key ? "border-gray-900 scale-110" : "border-transparent")} style={{ background: t.preview }} title={t.name} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: theme.textMuted }}>Personality</label>
              <select value={preferences.personality_mode} onChange={(e) => updatePreferences({ personality_mode: e.target.value as any })} className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: theme.background, borderColor: theme.border, color: theme.text }}>
                <option value="auto">Auto (Based on Role)</option>
                <option value="playful">Playful (Young Students)</option>
                <option value="study_buddy">Study Buddy (Older Students)</option>
                <option value="professional">Professional (Parents)</option>
                <option value="efficient">Efficient (Staff)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: theme.textMuted }}>Font Size</label>
              <div className="flex gap-2">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button key={size} onClick={() => updatePreferences({ font_size: size })} className={cn("px-3 py-1 rounded-lg text-xs border transition-colors", preferences.font_size === size ? "font-bold" : "")} style={{ background: preferences.font_size === size ? theme.primary : theme.background, color: preferences.font_size === size ? theme.textInverse : theme.text, borderColor: theme.border }}>
                    {size === "small" ? "A" : size === "medium" ? "A" : "A"}<span className="ml-1 capitalize">{size}</span>
                  </button>
                ))}
              </div>
            </div>
            {[
              { key: "show_timestamps", label: "Show Timestamps" },
              { key: "enable_streaming", label: "Streaming" },
              { key: "enable_sound", label: "Sound" },
            ].map((opt) => (
              <div key={opt.key} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: theme.text }}>{opt.label}</span>
                <button onClick={() => updatePreferences({ [opt.key]: !preferences[opt.key as keyof typeof preferences] })} className={cn("w-10 h-5 rounded-full transition-colors relative", preferences[opt.key as keyof typeof preferences] ? "" : "bg-gray-300")} style={{ background: preferences[opt.key as keyof typeof preferences] ? theme.primary : undefined }}>
                  <div className={cn("w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all", preferences[opt.key as keyof typeof preferences] ? "left-5" : "left-0.5")} />
                </button>
              </div>
            ))}
            <button onClick={exportChat} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors" style={{ borderColor: theme.border, color: theme.text }}>
              <Download className="w-4 h-4" /> Export Chat
            </button>
            <button onClick={() => setShowShortcuts(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors" style={{ borderColor: theme.border, color: theme.text }}>
              <Keyboard className="w-4 h-4" /> Keyboard Shortcuts
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={cn("flex-1 overflow-y-auto p-4 space-y-4", fontSizeClass)} style={{ scrollbarWidth: "thin", scrollbarColor: `${theme.scrollbarThumb} ${theme.scrollbarTrack}` }}>
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: theme.primary + "15" }}>
              <img src="/joy-logo.png" alt="Joy" className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <Bot className="w-8 h-8 hidden" style={{ color: theme.primary }} />
            </div>
            <div>
              <h4 className="font-semibold mb-1" style={{ color: theme.text }}>{getGreeting()}</h4>
              <p className="text-sm" style={{ color: theme.textMuted }}>I'm here to help with academics, administration, and spiritual growth.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
              {getSmartSuggestions().map((prompt, i) => (
                <button key={i} onClick={() => handleSend(prompt.sendText)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all hover:scale-[1.02]" style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text }}>
                  <span style={{ color: theme.primary }}>{prompt.icon}</span><span>{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={msg.id || index} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: msg.role === "user" ? theme.userBubble : theme.primary + "15" }}>
              {msg.role === "user" ? (
                <span className="text-xs font-bold" style={{ color: theme.userBubbleText }}>{userName.charAt(0).toUpperCase()}</span>
              ) : (
                <>
                  <img src="/joy-logo.png" alt="Joy" className="w-5 h-5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                  <Bot className="w-4 h-4 hidden" style={{ color: theme.primary }} />
                </>
              )}
            </div>
            <div className={cn("max-w-[80%] space-y-1", msg.role === "user" ? "items-end" : "items-start")}>
              <div className={cn("px-4 py-3 rounded-2xl", msg.role === "user" ? "rounded-br-md" : "rounded-bl-md")} style={{ background: msg.role === "user" ? theme.userBubble : theme.assistantBubble, color: msg.role === "user" ? theme.userBubbleText : theme.assistantBubbleText }}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none" style={{ color: theme.assistantBubbleText }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <div className="relative group">
                            <button onClick={() => copyToClipboard(String(children).replace(/\n$/, ""), `code-${index}`)} className="absolute top-2 right-2 p-1 rounded bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                              {copiedId === `code-${index}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-white" />}
                            </button>
                            <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>{String(children).replace(/\n$/, "")}</SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className="px-1 py-0.5 rounded text-xs" style={{ background: theme.codeBg, color: theme.textInverse }} {...props}>{children}</code>
                        );
                      },
                      p: ({ children }: any) => <p style={{ color: theme.assistantBubbleText }} className="m-0 mb-2 last:mb-0">{children}</p>,
                      li: ({ children }: any) => <li style={{ color: theme.assistantBubbleText }}>{children}</li>,
                      strong: ({ children }: any) => <strong style={{ color: theme.assistantBubbleText }}>{children}</strong>,
                      em: ({ children }: any) => <em style={{ color: theme.assistantBubbleText }}>{children}</em>,
                      a: ({ children, href }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: theme.primary }}>{children}</a>,
                    }}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="m-0">{msg.content}</p>
                )}
              </div>
              <div className="flex items-center gap-2 px-1">
                {preferences.show_timestamps && <span className="text-[10px]" style={{ color: theme.textMuted }}>{formatTime(msg.created_at)}</span>}
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => copyToClipboard(msg.content, msg.id)} className="p-1 rounded hover:bg-black/5 transition-colors" title="Copy">
                      {copiedId === msg.id ? <Check className="w-3 h-3" style={{ color: theme.primary }} /> : <Copy className="w-3 h-3" style={{ color: theme.textMuted }} />}
                    </button>
                    <button onClick={() => handleReaction(msg.id, "like")} className="p-1 rounded hover:bg-black/5 transition-colors" title="Helpful">
                      <ThumbsUp className={cn("w-3 h-3", reactions[msg.id] === "like" ? "fill-green-500 text-green-500" : "")} style={{ color: reactions[msg.id] === "like" ? undefined : theme.textMuted }} />
                    </button>
                    <button onClick={() => handleReaction(msg.id, "dislike")} className="p-1 rounded hover:bg-black/5 transition-colors" title="Not helpful">
                      <ThumbsDown className={cn("w-3 h-3", reactions[msg.id] === "dislike" ? "fill-red-500 text-red-500" : "")} style={{ color: reactions[msg.id] === "dislike" ? undefined : theme.textMuted }} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isStreaming && streamingText && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: theme.primary + "15" }}>
              <img src="/joy-logo.png" alt="Joy" className="w-5 h-5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <Bot className="w-4 h-4" style={{ color: theme.primary }} />
            </div>
            <div className="max-w-[80%]">
              <div className="px-4 py-3 rounded-2xl rounded-bl-md" style={{ background: theme.assistantBubble, color: theme.assistantBubbleText }}>
                <p className="m-0">{streamingText}<span className="animate-pulse">▌</span></p>
              </div>
            </div>
          </div>
        )}

        {isLoading && !isStreaming && <ThinkingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && !isLoading && !isStreaming && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => handleSend(s)} className="px-3 py-1.5 rounded-full text-xs border transition-colors hover:scale-105" style={{ borderColor: theme.border, color: theme.text, background: theme.surface }}>{s}</button>
          ))}
        </div>
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 flex-wrap">
            {attachments.map((att) => (
              <AttachmentChip key={att.id} attachment={att} formatFileSize={formatFileSize} onRemove={removeAttachment} onPreview={setPreviewAttachment} theme={theme} />
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
        <div className="flex items-end gap-2 rounded-xl px-3 py-2" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <button onClick={() => setShowBottomSheet(true)} className="p-2 rounded-lg hover:bg-black/5 transition-colors shrink-0" title="Add attachment">
            <Plus className="w-4 h-4" style={{ color: theme.textMuted }} />
          </button>
          <button onClick={toggleVoice} className={cn("p-2 rounded-lg transition-colors shrink-0", isListening ? "animate-pulse" : "hover:bg-black/5")} style={{ background: isListening ? theme.primary + "20" : "transparent" }} title="Voice input">
            {isListening ? <Mic className="w-4 h-4" style={{ color: theme.primary }} /> : <MicOff className="w-4 h-4" style={{ color: theme.textMuted }} />}
          </button>
          <textarea
            ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            onPaste={handlePaste}
            placeholder="Ask Joy anything..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm py-2 max-h-32"
            style={{ color: theme.text }}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || isStreaming || (!input.trim() && attachments.length === 0)}
            className={cn("p-2.5 rounded-xl transition-all shrink-0", (isLoading || isStreaming || (!input.trim() && attachments.length === 0)) ? "opacity-50 cursor-not-allowed" : "hover:scale-105")}
            style={{ background: theme.sendButton }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[10px] mt-1 text-center" style={{ color: theme.textMuted }}>Joy can make mistakes. Always verify important information.</p>
      </div>

      {/* Hidden file inputs - fresh each click */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files, "camera"); if (e.target.value) e.target.value = ""; }} />
      <input ref={photosInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files, "photos"); if (e.target.value) e.target.value = ""; }} />
      <input ref={docsInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx" multiple className="hidden" onChange={(e) => { addFiles(e.target.files, "documents"); if (e.target.value) e.target.value = ""; }} />
      <input ref={scannerInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files, "scanner"); if (e.target.value) e.target.value = ""; }} />

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        onCamera={handleCamera}
        onPhotos={handlePhotos}
        onDocuments={handleDocuments}
        onVoice={handleVoice}
        onWhiteboard={handleWhiteboard}
        onScanner={handleScanner}
        onPoll={handlePoll}
        onLink={handleLink}
        theme={theme}
      />

      {/* Attachment Preview */}
      {previewAttachment && (
        <AttachmentPreview
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
          onUpdate={updateAttachment}
          theme={theme}
        />
      )}

      {/* Link Input Modal */}
      {showLinkInput && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <h4 className="font-semibold mb-4" style={{ color: theme.text }}>Add Link</h4>
            <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg text-sm border outline-none mb-4" style={{ background: theme.background, borderColor: theme.border, color: theme.text }} />
            <div className="flex gap-2">
              <button onClick={() => setShowLinkInput(false)} className="flex-1 py-2 rounded-lg text-sm border" style={{ borderColor: theme.border, color: theme.text }}>Cancel</button>
              <button onClick={submitLink} className="flex-1 py-2 rounded-lg text-sm text-white font-medium" style={{ background: theme.primary }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Poll Input Modal */}
      {showPollInput && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <h4 className="font-semibold mb-4" style={{ color: theme.text }}>Create Poll</h4>
            <input type="text" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Question..." className="w-full px-3 py-2 rounded-lg text-sm border outline-none mb-3" style={{ background: theme.background, borderColor: theme.border, color: theme.text }} />
            {pollOptions.map((opt, i) => (
              <input key={i} type="text" value={opt} onChange={(e) => { const newOpts = [...pollOptions]; newOpts[i] = e.target.value; setPollOptions(newOpts); }} placeholder={`Option ${i + 1}`} className="w-full px-3 py-2 rounded-lg text-sm border outline-none mb-2" style={{ background: theme.background, borderColor: theme.border, color: theme.text }} />
            ))}
            <button onClick={() => setPollOptions([...pollOptions, ""])} className="text-xs mb-4" style={{ color: theme.primary }}>+ Add option</button>
            <div className="flex gap-2">
              <button onClick={() => setShowPollInput(false)} className="flex-1 py-2 rounded-lg text-sm border" style={{ borderColor: theme.border, color: theme.text }}>Cancel</button>
              <button onClick={submitPoll} className="flex-1 py-2 rounded-lg text-sm text-white font-medium" style={{ background: theme.primary }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Whiteboard Modal (simplified) */}
      {showWhiteboard && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.border }}>
              <h4 className="font-semibold" style={{ color: theme.text }}>Whiteboard</h4>
              <button onClick={() => setShowWhiteboard(false)} className="p-2 rounded-lg hover:bg-black/5"><X className="w-4 h-4" style={{ color: theme.textMuted }} /></button>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm mb-4" style={{ color: theme.textMuted }}>Whiteboard feature coming soon. Use the image upload to share drawings for now.</p>
              <button onClick={() => setShowWhiteboard(false)} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: theme.primary }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts */}
      {showShortcuts && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="rounded-2xl p-6 w-80 max-w-[90%]" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <h4 className="font-semibold mb-4" style={{ color: theme.text }}>Keyboard Shortcuts</h4>
            <div className="space-y-2 text-sm">
              {[
                { key: "Ctrl/Cmd + K", desc: "Open/Close Joy" },
                { key: "Ctrl/Cmd + N", desc: "New conversation" },
                { key: "Ctrl/Cmd + F", desc: "Toggle full screen" },
                { key: "Ctrl/Cmd + /", desc: "Show shortcuts" },
                { key: "Shift + Enter", desc: "New line" },
                { key: "Enter", desc: "Send message" },
                { key: "Esc", desc: "Close panels / Exit" },
              ].map((s) => (
                <div key={s.key} className="flex justify-between items-center py-1">
                  <span style={{ color: theme.textMuted }}>{s.desc}</span>
                  <kbd className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}>{s.key}</kbd>
                </div>
              ))}
            </div>
            <button onClick={() => setShowShortcuts(false)} className="w-full mt-4 py-2 rounded-lg text-sm font-medium" style={{ background: theme.primary, color: theme.textInverse }}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
