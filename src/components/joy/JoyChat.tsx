"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ADMIN_SEGMENT } from "@/lib/constants";
import {
  Bot, X, Send, Mic, MicOff, Plus, Download, Copy, Check,
  ThumbsUp, ThumbsDown, Sparkles, BookOpen, Calendar,
  GraduationCap, Lightbulb, Volume2, VolumeX, Keyboard,
  Link2, PenTool, BarChart3, ScanLine, Camera, FileText,
  Palette, Eraser, Trash, Undo, CheckCheck, Paperclip, Loader2,
  Search, Globe, Youtube, Play, ExternalLink, ChevronRight, AlertCircle,
  RefreshCw, MessageCircle, Wand2, Table, FileSpreadsheet, Users, Bell
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
import { getThemeConfig, THEME_MAP, THEME_LIST } from "@/lib/joy-themes";
import { JoyMessage, JoyTheme, JoyAction, JoyUserPreferences } from "@/types/joy";
import { AttachmentFile } from "@/types/attachments";
import { AttachmentChip } from "./AttachmentChip";
import { AttachmentPreview } from "./AttachmentPreview";
import { BottomSheet } from "./BottomSheet";
import { JoyHeader } from "./JoyHeader";
import { JoySidebar } from "./JoySidebar";
import { JoySearchModal } from "./JoySearchModal";
import { JoyWhiteboard } from "./JoyWhiteboard";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface GreetingPrompt {
  icon: React.ReactNode;
  text: string;
  sendText: string;
}

export function JoyChat() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    conversations, currentConversation, messages, loading: convLoading,
    createConversation, selectConversation, updateConversation, deleteConversation, setMessages,
  } = useJoyConversations();

  const { preferences, updatePreferences } = useJoyPreferences();
  const theme = getThemeConfig(preferences.theme as JoyTheme);

  const {
    attachments, showBottomSheet, setShowBottomSheet, previewAttachment, setPreviewAttachment,
    addFiles, addLink, addPoll, addWhiteboard, addSearch, updateAttachment, removeAttachment,
    clearAttachments, uploadAll, retryUpload, formatFileSize, isUploading,
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
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const docsInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  const userName = user?.full_name || user?.email?.split("@")[0] || "there";
  const userCategory = user?.user_category || "student";
  const userRole = user?.role || "student";

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
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
      { icon: <Search className="w-4 h-4" />, text: "Search for videos", sendText: "Find me educational videos" },
      ...common,
    ];
    if (userCategory === "parent") return [
      { icon: <GraduationCap className="w-4 h-4" />, text: "How is my child doing?", sendText: "How is my child performing academically?" },
      { icon: <Calendar className="w-4 h-4" />, text: "Upcoming events", sendText: "What upcoming events are there?" },
      { icon: <BookOpen className="w-4 h-4" />, text: "Fee payments", sendText: "Show me fee payment history" },
      ...common,
    ];
    if (userCategory === "staff") return [
      { icon: <Calendar className="w-4 h-4" />, text: "My teaching schedule", sendText: "What is my teaching schedule?" },
      { icon: <BookOpen className="w-4 h-4" />, text: "Create assignment", sendText: "Help me create a new assignment" },
      { icon: <GraduationCap className="w-4 h-4" />, text: "Enter marks", sendText: "Help me enter student marks" },
      { icon: <Users className="w-4 h-4" />, text: "Send message", sendText: "Help me send a message to parents" },
      ...common,
    ];
    if (userCategory === "admin") return [
      { icon: <Calendar className="w-4 h-4" />, text: "Manage timetable", sendText: "Help me manage the school timetable" },
      { icon: <BookOpen className="w-4 h-4" />, text: "CMS pages", sendText: "Help me manage CMS pages" },
      { icon: <GraduationCap className="w-4 h-4" />, text: "Student analytics", sendText: "Show me student performance analytics" },
      { icon: <Bell className="w-4 h-4" />, text: "Send announcement", sendText: "Help me send a school announcement" },
      ...common,
    ];
    return common;
  }, [userCategory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, isLoading]);

  const handleNewChat = useCallback(async () => {
    await createConversation();
    setShowSidebar(false);
    setMessages([]);
    setStreamingText("");
    setSuggestions([]);
    clearAttachments();
    setErrorMessage(null);
    setRetryCount(0);
  }, [createConversation, clearAttachments, setMessages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showLinkInput) { setShowLinkInput(false); return; }
        if (showPollInput) { setShowPollInput(false); return; }
        if (showWhiteboard) { setShowWhiteboard(false); return; }
        if (previewAttachment) { setPreviewAttachment(null); return; }
        if (showSearchModal) { setShowSearchModal(false); return; }
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
  }, [isFullScreen, isOpen, showSettings, showSidebar, previewAttachment, showLinkInput, showPollInput, showWhiteboard, showSearchModal, handleNewChat, setPreviewAttachment]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target as Node)) {
        setShowAttachmentMenu(false);
      }
    }
    if (showAttachmentMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAttachmentMenu]);

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognitionCtor = window.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) return;
      const rec = new SpeechRecognitionCtor();
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) { toast.error("Voice input not supported in this browser"); return; }
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  const speakText = useCallback((text: string, messageId: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speakingId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(utterance);
    setSpeakingId(messageId);
  }, [speakingId]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files, "documents");
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const dt = new DataTransfer();
          dt.items.add(file);
          addFiles(dt.files, "photos");
        }
      }
    }
  };

  const handleCamera = () => { cameraInputRef.current?.click(); };
  const handlePhotos = () => { photosInputRef.current?.click(); };
  const handleDocuments = () => { docsInputRef.current?.click(); };
  const handleScanner = () => { scannerInputRef.current?.click(); };
  const handleWhiteboardOpen = () => { setShowWhiteboard(true); setShowAttachmentMenu(false); };
  const handlePoll = () => { setShowPollInput(true); setShowAttachmentMenu(false); };
  const handleLink = () => { setShowLinkInput(true); setShowAttachmentMenu(false); };

  const submitLink = () => {
    if (!linkUrl.trim()) return;
    addLink(linkUrl.trim());
    setLinkUrl("");
    setShowLinkInput(false);
    setTimeout(() => inputRef.current?.focus(), 100);
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

  const executeFrontendActions = useCallback((actions: JoyAction[]) => {
    if (!actions || actions.length === 0) return;
    for (const action of actions) {
      if (action.type === "navigate" && action.target) {
        const target = action.target;
        const pathMap: Record<string, string> = {
          fees_management: "/fees", vora: "/vora", grades: "/grades",
          timetable: "/timetable", assignments: "/assignments", attendance: "/attendance",
          calendar: "/calendar", library: "/library", messages: "/messages",
          admissions: "/manage/admissions", admin: `/${ADMIN_SEGMENT}`,
          teacher: "/teacher", student: "/student", parent: "/parent",
          profile: "/profile", settings: "/settings",
        };
        const path = pathMap[target] || (target.startsWith("/") ? target : `/${target}`);
        toast.success(`Navigating to ${action.target}...`);
        setTimeout(() => router.push(path), 800);
      } else if (action.type === "refresh") {
        toast.success("Refreshing...");
        setTimeout(() => router.refresh(), 500);
      } else if (action.type === "notify") {
        toast.success(action.payload?.message as string || "Notification sent");
      } else if (action.type === "open_modal" && action.target) {
        toast(`Opening ${action.target}...`);
      } else if (action.type === "send_message" && action.payload) {
        toast.success("Message prepared for sending");
      }
    }
  }, [router]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText && attachments.length === 0) return;
    if (isLoading || isStreaming) return;
    setErrorMessage(null);

    let fullContent = messageText;
    const linkAttachments = attachments.filter((a) => a.type === "link" && a.url);
    if (linkAttachments.length > 0) {
      const linksText = linkAttachments.map((a) => a.url).join("\n");
      fullContent = fullContent ? `${fullContent}\n\n${linksText}` : linksText;
    }

    const extractedAttachments = attachments.filter((a) => a.extractedContent);
    if (extractedAttachments.length > 0) {
      const extractText = extractedAttachments
        .map((a) => `[Document: ${a.name}]\n${a.extractedContent?.slice(0, 3000)}`)
        .join("\n\n");
      fullContent = fullContent ? `${fullContent}\n\n${extractText}` : extractText;
    }

    let conversationId = currentConversation?.id;
    if (!conversationId) {
      const conv = await createConversation(fullContent.slice(0, 30) || "New Chat");
      if (!conv) return;
      conversationId = conv.id;
    }
    if (!conversationId) return;

    const userMsg: JoyMessage = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      conversation_id: conversationId,
      role: "user",
      content: fullContent,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setStreamingText("");
    setSuggestions([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated. Please log in again.");

      const uploadedAttachments = await uploadAll();
      const attachmentUrls = uploadedAttachments
        .filter((a) => a.url)
        .map((a) => ({ name: a.name, type: a.type, url: a.url, metadata: a.metadata, extractedContent: a.extractedContent }));

      const chatMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      const apiBody = {
        messages: chatMessages,
        conversationId,
        stream: preferences.enable_streaming,
        attachments: attachmentUrls,
        preferences: {
          personality_mode: preferences.personality_mode,
          language_preference: preferences.language_preference,
        },
      };

      if (preferences.enable_streaming) {
        setIsStreaming(true);
        let fullText = "";
        let receivedAnyChunk = false;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(apiBody),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body from server");
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data) as { chunk?: string; toolCalls?: unknown[]; toolResult?: unknown; error?: string };
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.chunk) {
                receivedAnyChunk = true;
                fullText += parsed.chunk;
                setStreamingText(fullText);
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && !parseErr.message.includes("Unexpected token")) {
                console.warn("[JoyChat] Parse error:", parseErr.message);
              }
            }
          }
        }

        setIsStreaming(false);

        if (fullText || receivedAnyChunk) {
          const assistantMsg: JoyMessage = {
            id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
            conversation_id: conversationId,
            role: "assistant",
            content: fullText || "I processed your request.",
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          generateSuggestions(fullText);
          const actionMatch = fullText.match(/\{\s*"actions"\s*:\s*(\[[\s\S]*?\])\s*\}/);
          if (actionMatch) {
            try {
              const actions = JSON.parse(`{"actions":${actionMatch[1]}}`).actions as JoyAction[];
              executeFrontendActions(actions);
            } catch { /* ignore */ }
          }
        } else if (!receivedAnyChunk) {
          throw new Error("No response received from AI. Please try again.");
        }
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(apiBody),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        const replyText = json.reply || "I\'m sorry, I couldn\'t process that.";
        const assistantMsg: JoyMessage = {
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          conversation_id: conversationId,
          role: "assistant",
          content: replyText,
          metadata: json.actions ? { actions: json.actions } : undefined,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        generateSuggestions(replyText);
        if (json.actions?.length > 0) {
          executeFrontendActions(json.actions as JoyAction[]);
        }
      }
      setRetryCount(0);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to send message";
      console.error("[JoyChat] Send error:", error);
      setErrorMessage(msg);
      toast.error(msg);
      setRetryCount((c) => c + 1);
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
    if (lower.includes("fraction") || lower.includes("math") || lower.includes("equation")) {
      newSuggestions.push("Can you give me more examples?", "Quiz me on this topic");
    } else if (lower.includes("assignment") || lower.includes("homework")) {
      newSuggestions.push("When is this due?", "Help me plan my work");
    } else if (lower.includes("grade") || lower.includes("mark") || lower.includes("score")) {
      newSuggestions.push("How can I improve?", "What topics should I focus on?");
    } else if (lower.includes("timetable") || lower.includes("schedule") || lower.includes("class")) {
      newSuggestions.push("What\'s my next class?", "Show me the full week");
    } else if (lower.includes("video") || lower.includes("watch") || lower.includes("learn")) {
      newSuggestions.push("Find more videos on this", "Explain it in simpler terms");
    } else if (lower.includes("fee") || lower.includes("payment")) {
      newSuggestions.push("How do I make a payment?", "Show me the fee structure");
    } else {
      newSuggestions.push("Tell me more", "Can you explain that differently?", "Give me an example");
    }
    setSuggestions(newSuggestions.slice(0, 3));
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
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
    toast.success(type === "like" ? "Thanks for the feedback!" : "We\'ll improve!");
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fontSizeClass = preferences.font_size === "small" ? "text-xs" : preferences.font_size === "large" ? "text-base" : "text-sm";

  const handleWhiteboardSave = (dataUrl: string, strokes: Array<{ points: Array<{ x: number; y: number }>; color: string; width: number }>) => {
    addWhiteboard({ strokes, width: 800, height: 500, background: "#ffffff" }, dataUrl);
    toast.success("Whiteboard saved!");
  };

  const handleInsertLink = (url: string, title?: string) => {
    addLink(url, title);
    toast.success("Link added to message");
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 hover:shadow-2xl"
        style={{ background: theme.primary, boxShadow: theme.shadow }}
        title="Chat with Joy (Ctrl+K)"
      >
        <Image src="/joy-logo.png" alt="Joy" width={28} height={28} className="object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <Bot className="w-6 h-6 text-white hidden" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden transition-all",
        isFullScreen ? "inset-4 max-w-none max-h-none" : "bottom-6 right-6 w-[420px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2rem)]"
      )}
      style={{ background: theme.background, boxShadow: theme.shadow }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-2xl">
          <div className="px-6 py-4 rounded-xl bg-white/90 text-sm font-medium text-gray-800">Drop files here</div>
        </div>
      )}

      <JoyHeader
        theme={theme}
        isFullScreen={isFullScreen}
        showSidebar={showSidebar}
        showSettings={showSettings}
        currentTitle={currentConversation?.title || ""}
        onToggle={() => setIsOpen(false)}
        onToggleFullScreen={() => setIsFullScreen((p) => !p)}
        onToggleSidebar={() => setShowSidebar((p) => !p)}
        onToggleSettings={() => setShowSettings((p) => !p)}
        onNewChat={handleNewChat}
        onExport={exportChat}
        onShowShortcuts={() => setShowShortcuts(true)}
        onShowSearch={() => setShowSearchModal(true)}
      />

      {showSidebar && (
        <JoySidebar
          conversations={conversations}
          currentId={currentConversation?.id || null}
          theme={theme}
          onSelect={selectConversation}
          onDelete={deleteConversation}
          onPin={(id, pinned) => updateConversation(id, { is_pinned: pinned })}
        />
      )}

      {showSettings && (
        <div className="absolute right-0 top-[57px] bottom-0 w-72 z-20 flex flex-col" style={{ background: theme.surface, borderLeft: `1px solid ${theme.border}` }}>
          <div className="p-4 border-b" style={{ borderColor: theme.border }}>
            <h3 className="font-semibold text-sm" style={{ color: theme.text }}>Settings</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: theme.textMuted }}>Theme</label>
              <div className="grid grid-cols-2 gap-2">
                {THEME_LIST.map((t) => (
                  <button key={t.key} onClick={() => updatePreferences({ theme: t.key })} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all", preferences.theme === t.key ? "border-current" : "")} style={{ background: THEME_MAP[t.key].surface, borderColor: preferences.theme === t.key ? THEME_MAP[t.key].primary : theme.border, color: THEME_MAP[t.key].text }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: THEME_MAP[t.key].primary }} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: theme.textMuted }}>Personality</label>
              <select value={preferences.personality_mode} onChange={(e) => updatePreferences({ personality_mode: e.target.value as JoyUserPreferences["personality_mode"] })} className="w-full px-3 py-2 rounded-lg text-xs border outline-none" style={{ background: theme.background, borderColor: theme.border, color: theme.text }}>
                <option value="auto">Auto (Recommended)</option>
                <option value="playful">Playful</option>
                <option value="study_buddy">Study Buddy</option>
                <option value="professional">Professional</option>
                <option value="efficient">Efficient</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: theme.textMuted }}>Font Size</label>
              <div className="flex gap-2">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button key={size} onClick={() => updatePreferences({ font_size: size })} className={cn("flex-1 px-3 py-2 rounded-lg text-xs border capitalize transition-colors", preferences.font_size === size ? "text-white" : "")} style={{ background: preferences.font_size === size ? theme.primary : theme.background, borderColor: theme.border, color: preferences.font_size === size ? "#fff" : theme.text }}>
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {[
                { key: "enable_streaming" as const, label: "Enable Streaming", icon: <RefreshCw className="w-3.5 h-3.5" /> },
                { key: "show_timestamps" as const, label: "Show Timestamps", icon: <Calendar className="w-3.5 h-3.5" /> },
                { key: "enable_sound" as const, label: "Sound Effects", icon: <Volume2 className="w-3.5 h-3.5" /> },
              ].map((toggle) => (
                <button key={toggle.key} onClick={() => updatePreferences({ [toggle.key]: !preferences[toggle.key] })} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-colors" style={{ background: theme.background, borderColor: theme.border, color: theme.text }}>
                  <span className="flex items-center gap-2">{toggle.icon} {toggle.label}</span>
                  <div className={cn("w-8 h-4 rounded-full transition-colors relative", preferences[toggle.key] ? "" : "bg-gray-300")} style={{ background: preferences[toggle.key] ? theme.primary : undefined }}>
                    <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform", preferences[toggle.key] ? "translate-x-4" : "translate-x-0.5")} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" }}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="p-1 rounded hover:bg-red-100"><X className="w-3 h-3" /></button>
          </div>
        )}

        {messages.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: theme.primary + "15" }}>
              <Image src="/joy-logo.png" alt="Joy" width={40} height={40} className="object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <Bot className="w-8 h-8 hidden" style={{ color: theme.primary }} />
            </div>
            <h3 className="font-semibold text-lg mb-1" style={{ color: theme.text }}>{getGreeting()}</h3>
            <p className="text-sm mb-6" style={{ color: theme.textMuted }}>How can I help you today?</p>
            <div className="grid grid-cols-1 gap-2 max-w-xs mx-auto">
              {getSmartSuggestions().map((s, i) => (
                <button key={i} onClick={() => handleSend(s.sendText)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs border transition-all hover:scale-[1.02]" style={{ background: theme.surface, borderColor: theme.border, color: theme.text }}>
                  <span style={{ color: theme.primary }}>{s.icon}</span>{s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: msg.role === "user" ? theme.primary : theme.primary + "15" }}>
              {msg.role === "user" ? (
                <span className="text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
              ) : (
                <>
                  <Image src="/joy-logo.png" alt="Joy" width={20} height={20} className="object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <Bot className="w-4 h-4 hidden" style={{ color: theme.primary }} />
                </>
              )}
            </div>
            <div className={cn("max-w-[80%] space-y-1", msg.role === "user" ? "items-end" : "items-start")}>
              <div className={cn("px-4 py-2.5 rounded-2xl text-sm", msg.role === "user" ? "rounded-br-md" : "rounded-bl-md")} style={{ background: msg.role === "user" ? theme.userBubble : theme.assistantBubble, color: msg.role === "user" ? theme.userBubbleText : theme.assistantBubbleText }}>
                {msg.role === "assistant" ? (
                  <div className={cn("prose prose-sm max-w-none", fontSizeClass)} style={{ color: "inherit" }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: CodeBlock,
                        table: TableBlock,
                        th: ThBlock,
                        td: TdBlock,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <span className={fontSizeClass}>{msg.content}</span>
                )}
              </div>
              <div className={cn("flex items-center gap-1", msg.role === "user" ? "justify-end" : "justify-start")}>
                {preferences.show_timestamps && <span className="text-[10px]" style={{ color: theme.textMuted }}>{formatTime(msg.created_at)}</span>}
                {msg.role === "assistant" && (
                  <>
                    <button onClick={() => copyToClipboard(msg.content, msg.id)} className="p-1 rounded hover:bg-black/5 transition-colors" title="Copy">
                      {copiedId === msg.id ? <Check className="w-3 h-3" style={{ color: "#22c55e" }} /> : <Copy className="w-3 h-3" style={{ color: theme.textMuted }} />}
                    </button>
                    <button onClick={() => speakText(msg.content, msg.id)} className="p-1 rounded hover:bg-black/5 transition-colors" title={speakingId === msg.id ? "Stop speaking" : "Read aloud"}>
                      {speakingId === msg.id ? <VolumeX className="w-3 h-3" style={{ color: theme.primary }} /> : <Volume2 className="w-3 h-3" style={{ color: theme.textMuted }} />}
                    </button>
                    <button onClick={() => handleReaction(msg.id, "like")} className="p-1 rounded hover:bg-black/5 transition-colors" title="Helpful">
                      <ThumbsUp className={cn("w-3 h-3", reactions[msg.id] === "like" ? "fill-current" : "")} style={{ color: reactions[msg.id] === "like" ? theme.primary : theme.textMuted }} />
                    </button>
                    <button onClick={() => handleReaction(msg.id, "dislike")} className="p-1 rounded hover:bg-black/5 transition-colors" title="Not helpful">
                      <ThumbsDown className={cn("w-3 h-3", reactions[msg.id] === "dislike" ? "fill-current" : "")} style={{ color: reactions[msg.id] === "dislike" ? "#ef4444" : theme.textMuted }} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {isStreaming && streamingText && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: theme.primary + "15" }}>
              <Image src="/joy-logo.png" alt="Joy" width={20} height={20} className="object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div className="max-w-[80%]">
              <div className="px-4 py-2.5 rounded-2xl rounded-bl-md text-sm" style={{ background: theme.assistantBubble, color: theme.assistantBubbleText }}>
                <div className={cn("prose prose-sm max-w-none", fontSizeClass)}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock, table: TableBlock, th: ThBlock, td: TdBlock }}>
                    {streamingText}
                  </ReactMarkdown>
                </div>
                <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: theme.primary }} />
              </div>
            </div>
          </div>
        )}

        {isLoading && !isStreaming && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: theme.primary + "15" }}>
              <Image src="/joy-logo.png" alt="Joy" width={20} height={20} className="object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-md" style={{ background: theme.assistantBubble }}>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: theme.primary, animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: theme.primary, animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: theme.primary, animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {suggestions.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSend(s)} className="px-3 py-1.5 rounded-full text-xs border transition-all hover:scale-105" style={{ background: theme.surface, borderColor: theme.border, color: theme.text }}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 px-4 py-3 border-t space-y-2" style={{ borderColor: theme.border, background: theme.surface }}>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <AttachmentChip key={att.id} attachment={att} formatFileSize={formatFileSize} onRemove={removeAttachment} onPreview={setPreviewAttachment} onUpload={retryUpload} theme={theme} />
            ))}
          </div>
        )}

        {showLinkInput && (
          <div className="flex items-center gap-2">
            <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitLink(); }} placeholder="Paste link URL..." className="flex-1 px-3 py-2 rounded-lg text-xs border outline-none" style={{ background: theme.background, borderColor: theme.border, color: theme.text }} autoFocus />
            <button onClick={() => setShowLinkInput(false)} className="px-3 py-2 rounded-lg text-xs" style={{ color: theme.textMuted }}>Cancel</button>
            <button onClick={submitLink} className="px-3 py-2 rounded-lg text-xs font-medium text-white" style={{ background: theme.primary }}>Add</button>
          </div>
        )}

        {showPollInput && (
          <div className="space-y-2">
            <input type="text" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Poll question..." className="w-full px-3 py-2 rounded-lg text-xs border outline-none" style={{ background: theme.background, borderColor: theme.border, color: theme.text }} />
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={opt} onChange={(e) => setPollOptions((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })} placeholder={`Option ${i + 1}`} className="flex-1 px-3 py-2 rounded-lg text-xs border outline-none" style={{ background: theme.background, borderColor: theme.border, color: theme.text }} />
                {pollOptions.length > 2 && (
                  <button onClick={() => setPollOptions((prev) => prev.filter((_, idx) => idx !== i))} className="p-1 rounded hover:bg-red-50"><X className="w-3 h-3 text-red-500" /></button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <button onClick={() => setPollOptions((prev) => [...prev, ""])} className="text-xs" style={{ color: theme.primary }}>+ Add option</button>
              <div className="flex-1" />
              <button onClick={() => setShowPollInput(false)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: theme.textMuted }}>Cancel</button>
              <button onClick={submitPoll} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: theme.primary }}>Create Poll</button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} onPaste={handlePaste} placeholder="Ask Joy anything..." rows={1} className={cn("w-full px-4 py-2.5 pr-10 rounded-xl text-sm border resize-none outline-none focus:ring-2", fontSizeClass)} style={{ background: theme.surface, borderColor: theme.border, color: theme.text, maxHeight: "120px", minHeight: "40px" }} />
            <button onClick={() => setShowAttachmentMenu((p) => !p)} className="absolute right-3 bottom-2.5 p-1 rounded hover:bg-black/5 transition-colors" title="Add attachment">
              <Paperclip className="w-4 h-4" style={{ color: theme.textMuted }} />
            </button>
          </div>
          <button onClick={() => toggleVoice()} className={cn("p-2.5 rounded-xl transition-colors", isListening ? "animate-pulse" : "")} style={{ background: isListening ? "#ef4444" : theme.surface, color: isListening ? "#fff" : theme.textMuted }} title={isListening ? "Stop listening" : "Voice input"}>
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button onClick={() => handleSend()} disabled={isLoading || isStreaming || (!input.trim() && attachments.length === 0)} className="p-2.5 rounded-xl text-white transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100" style={{ background: theme.sendButton }}>
            {isLoading || isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <div ref={attachmentMenuRef} className="relative">
          {showAttachmentMenu && (
            <BottomSheet
              isOpen={showAttachmentMenu}
              onClose={() => setShowAttachmentMenu(false)}
              onCamera={handleCamera}
              onPhotos={handlePhotos}
              onDocuments={handleDocuments}
              onScanner={handleScanner}
              onVoice={() => { toggleVoice(); setShowAttachmentMenu(false); }}
              onWhiteboard={handleWhiteboardOpen}
              onPoll={handlePoll}
              onLink={handleLink}
              onSearch={() => { setShowSearchModal(true); setShowAttachmentMenu(false); }}
              theme={theme}
            />
          )}
        </div>
      </div>

      <JoySearchModal
        isOpen={showSearchModal}
        theme={theme}
        onClose={() => setShowSearchModal(false)}
        onInsertLink={handleInsertLink}
      />

      <JoyWhiteboard
        isOpen={showWhiteboard}
        theme={theme}
        onClose={() => setShowWhiteboard(false)}
        onSave={handleWhiteboardSave}
      />

      {previewAttachment && <AttachmentPreview attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} onUpdate={updateAttachment} theme={theme} />}

      {showShortcuts && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowShortcuts(false)}>
          <div className="max-w-sm w-full rounded-2xl p-5 shadow-2xl" style={{ background: theme.surface }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: theme.text }}>Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className="p-1 rounded hover:bg-black/5"><X className="w-4 h-4" style={{ color: theme.textMuted }} /></button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { keys: "Ctrl/Cmd + K", action: "Open/Close Joy" },
                { keys: "Ctrl/Cmd + N", action: "New chat" },
                { keys: "Ctrl/Cmd + F", action: "Toggle fullscreen" },
                { keys: "Ctrl/Cmd + /", action: "Show shortcuts" },
                { keys: "Esc", action: "Close panels" },
                { keys: "Enter", action: "Send message" },
                { keys: "Shift + Enter", action: "New line" },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: theme.border }}>
                  <span style={{ color: theme.textMuted }}>{s.action}</span>
                  <kbd className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}>{s.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files, "camera"); e.target.value = ""; }} />
      <input ref={photosInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files, "photos"); e.target.value = ""; }} />
      <input ref={docsInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" multiple className="hidden" onChange={(e) => { addFiles(e.target.files, "documents"); e.target.value = ""; }} />
      <input ref={scannerInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files, "scanner"); e.target.value = ""; }} />
    </div>
  );
}

function CodeBlock({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
  const match = /language-(\w+)/.exec(className || "");
  return !inline && match ? (
    <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
      {String(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  ) : (
    <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#1e293b", color: "#ffffff" }} {...props}>{children}</code>
  );
}

function TableBlock({ children }: { children?: React.ReactNode }) {
  return <div className="overflow-x-auto my-2"><table className="w-full text-xs border-collapse">{children}</table></div>;
}

function ThBlock({ children }: { children?: React.ReactNode }) {
  return <th className="px-2 py-1.5 text-left font-semibold border-b" style={{ background: "#f1f5f9", borderColor: "#e2e8f0" }}>{children}</th>;
}

function TdBlock({ children }: { children?: React.ReactNode }) {
  return <td className="px-2 py-1.5 border-b" style={{ borderColor: "#e2e8f0" }}>{children}</td>;
}
