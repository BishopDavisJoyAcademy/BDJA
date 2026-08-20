"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ADMIN_SEGMENT } from "@/lib/constants";
import {
  Bot, X, RotateCcw, Send, Maximize2, Minimize2, MessageSquarePlus,
  ChevronLeft, Pin, Trash2, Settings, Mic, MicOff, Plus, Download,
  Copy, Check, ThumbsUp, ThumbsDown, Sparkles, BookOpen, Calendar,
  GraduationCap, Lightbulb, Volume2, VolumeX, Keyboard, ImagePlus,
  Link2, PenTool, BarChart3, ScanLine, Camera, FileText, ChevronDown,
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
import { JoyMessage, JoyConversation, JoyTheme, JoyAction, JoySearchResult, JoyVideoResult, JoyUserPreferences } from "@/types/joy";
import { AttachmentFile } from "@/types/attachments";
import { AttachmentChip } from "./AttachmentChip";
import { AttachmentPreview } from "./AttachmentPreview";
import { BottomSheet } from "./BottomSheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface GreetingPrompt {
  icon: React.ReactNode;
  text: string;
  sendText: string;
}

interface SearchModalState {
  isOpen: boolean;
  query: string;
  results: JoySearchResult[];
  videos: JoyVideoResult[];
  loading: boolean;
  activeTab: "web" | "youtube";
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
  const [pendingActions, setPendingActions] = useState<JoyAction[]>([]);
  const [searchModal, setSearchModal] = useState<SearchModalState>({
    isOpen: false, query: "", results: [], videos: [], loading: false, activeTab: "web",
  });
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
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null);
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<Array<{ points: Array<{ x: number; y: number }>; color: string; width: number }>>([]);
  const [whiteboardCurrentStroke, setWhiteboardCurrentStroke] = useState<{ points: Array<{ x: number; y: number }>; color: string; width: number } | null>(null);
  const [whiteboardColor, setWhiteboardColor] = useState("#1e3a5f");
  const [whiteboardSize, setWhiteboardSize] = useState(3);
  const [whiteboardTool, setWhiteboardTool] = useState<"pen" | "eraser">("pen");
  const whiteboardCtxRef = useRef<CanvasRenderingContext2D | null>(null);

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
    setPendingActions([]);
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
        if (searchModal.isOpen) { setSearchModal((s) => ({ ...s, isOpen: false })); return; }
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
  }, [isFullScreen, isOpen, showSettings, showSidebar, previewAttachment, showLinkInput, showPollInput, showWhiteboard, searchModal.isOpen, handleNewChat, setPreviewAttachment]);

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

  const handleSearch = useCallback(async () => {
    if (!searchModal.query.trim()) return;
    setSearchModal((s) => ({ ...s, loading: true, results: [], videos: [] }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch("/api/joy/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ query: searchModal.query, source: searchModal.activeTab, maxResults: 5 }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (searchModal.activeTab === "youtube") {
        setSearchModal((s) => ({ ...s, videos: json.results || [], loading: false }));
      } else {
        setSearchModal((s) => ({ ...s, results: json.results || [], loading: false }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      toast.error(msg);
      setSearchModal((s) => ({ ...s, loading: false }));
    }
  }, [searchModal.query, searchModal.activeTab]);

  const insertSearchResult = (result: JoySearchResult) => {
    addLink(result.url, result.title);
    setSearchModal((s) => ({ ...s, isOpen: false }));
    toast.success("Link added to message");
  };

  const insertVideoResult = (video: JoyVideoResult) => {
    addLink(`https://youtube.com/watch?v=${video.videoId}`, video.title);
    setSearchModal((s) => ({ ...s, isOpen: false }));
    toast.success("Video added to message");
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
    setPendingActions([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated. Please log in again.");

      const uploadedAttachments = await uploadAll();
      const attachmentUrls = uploadedAttachments
        .filter((a) => a.url)
        .map((a) => ({ name: a.name, type: a.type, url: a.url, metadata: a.metadata, extractedContent: a.extractedContent }));

      const chatMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      if (preferences.enable_streaming) {
        setIsStreaming(true);
        let fullText = "";
        let receivedAnyChunk = false;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ messages: chatMessages, conversationId, stream: true, attachments: attachmentUrls }),
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
          body: JSON.stringify({ messages: chatMessages, conversationId, stream: false, attachments: attachmentUrls }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        const replyText = json.reply || "I'm sorry, I couldn't process that.";
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
      setPendingActions([]);
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
      newSuggestions.push("What's my next class?", "Show me the full week");
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
    toast.success(type === "like" ? "Thanks for the feedback!" : "We'll improve!");
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fontSizeClass = preferences.font_size === "small" ? "text-xs" : preferences.font_size === "large" ? "text-base" : "text-sm";

  useEffect(() => {
    if (!showWhiteboard || !whiteboardCanvasRef.current) return;
    const canvas = whiteboardCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    whiteboardCtxRef.current = ctx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = whiteboardColor;
    ctx.lineWidth = whiteboardSize;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    whiteboardStrokes.forEach((stroke) => {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      stroke.points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    });
  }, [showWhiteboard, whiteboardStrokes, whiteboardColor, whiteboardSize]);

  const getWhiteboardPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
  };

  const handleWhiteboardStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getWhiteboardPos(e);
    const newStroke = { points: [pos], color: whiteboardTool === "eraser" ? "#ffffff" : whiteboardColor, width: whiteboardTool === "eraser" ? whiteboardSize * 3 : whiteboardSize };
    setWhiteboardCurrentStroke(newStroke);
  };

  const handleWhiteboardMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!whiteboardCurrentStroke) return;
    const pos = getWhiteboardPos(e);
    const updated = { ...whiteboardCurrentStroke, points: [...whiteboardCurrentStroke.points, pos] };
    setWhiteboardCurrentStroke(updated);
    const ctx = whiteboardCtxRef.current;
    const canvas = whiteboardCanvasRef.current;
    if (!ctx || !canvas) return;
    const pts = updated.points;
    const last = pts[pts.length - 2];
    if (!last) return;
    ctx.beginPath();
    ctx.strokeStyle = updated.color;
    ctx.lineWidth = updated.width;
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleWhiteboardEnd = () => {
    if (!whiteboardCurrentStroke) return;
    setWhiteboardStrokes((prev) => [...prev, whiteboardCurrentStroke]);
    setWhiteboardCurrentStroke(null);
  };

  const handleWhiteboardUndo = () => setWhiteboardStrokes((prev) => prev.slice(0, -1));
  const handleWhiteboardClear = () => setWhiteboardStrokes([]);

  const handleWhiteboardSave = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    addWhiteboard({ strokes: whiteboardStrokes, width: canvas.width, height: canvas.height, background: "#ffffff" }, dataUrl);
    setShowWhiteboard(false);
    setWhiteboardStrokes([]);
    toast.success("Whiteboard saved!");
  };

  const ThinkingIndicator = () => (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: theme.primary + "15" }}>
        <Image src="/joy-logo.png" alt="Joy" width={20} height={20} className="object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <Bot className="w-4 h-4 hidden" style={{ color: theme.primary }} />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-md" style={{ background: theme.assistantBubble }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium" style={{ color: theme.textMuted }}>Joy is thinking</span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.primary, animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.primary, animationDelay: "0.3s" }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.primary, animationDelay: "0.6s" }} />
          </div>
        </div>
      </div>
    </div>
  );

  const SearchModal = () => {
    if (!searchModal.isOpen) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSearchModal((s) => ({ ...s, isOpen: false }))}>
        <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" style={{ background: theme.background }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5" style={{ color: theme.primary }} />
              <h3 className="font-semibold text-sm" style={{ color: theme.text }}>Search the Web</h3>
            </div>
            <button onClick={() => setSearchModal((s) => ({ ...s, isOpen: false }))} className="p-1 rounded-lg hover:bg-black/5"><X className="w-4 h-4" style={{ color: theme.textMuted }} /></button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <input type="text" value={searchModal.query} onChange={(e) => setSearchModal((s) => ({ ...s, query: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="Search for information, videos, or resources..." className="flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none" style={{ background: theme.surface, borderColor: theme.border, color: theme.text }} autoFocus />
              <button onClick={handleSearch} disabled={searchModal.loading} className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: theme.primary }}>
                {searchModal.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSearchModal((s) => ({ ...s, activeTab: "web", results: [], videos: [] }))} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", searchModal.activeTab === "web" ? "text-white" : "")} style={{ background: searchModal.activeTab === "web" ? theme.primary : theme.surface, color: searchModal.activeTab === "web" ? "#fff" : theme.text }}>
                <Globe className="w-3 h-3 inline mr-1" /> Web
              </button>
              <button onClick={() => setSearchModal((s) => ({ ...s, activeTab: "youtube", results: [], videos: [] }))} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", searchModal.activeTab === "youtube" ? "text-white" : "")} style={{ background: searchModal.activeTab === "youtube" ? "#ff0000" : theme.surface, color: searchModal.activeTab === "youtube" ? "#fff" : theme.text }}>
                <Youtube className="w-3 h-3 inline mr-1" /> YouTube
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {searchModal.activeTab === "web" && searchModal.results.map((result, i) => (
              <div key={i} className="p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all" style={{ background: theme.surface, borderColor: theme.border }} onClick={() => insertSearchResult(result)}>
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 mt-0.5 shrink-0" style={{ color: theme.primary }} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate" style={{ color: theme.primary }}>{result.title}</h4>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: theme.textMuted }}>{result.snippet}</p>
                    <p className="text-[10px] mt-1 truncate" style={{ color: theme.textMuted + "80" }}>{result.url}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: theme.textMuted }} />
                </div>
              </div>
            ))}
            {searchModal.activeTab === "youtube" && searchModal.videos.map((video, i) => (
              <div key={i} className="p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all" style={{ background: theme.surface, borderColor: theme.border }} onClick={() => insertVideoResult(video)}>
                <div className="flex items-start gap-3">
                  <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-black/10">
                    {video.thumbnail ? <Image src={video.thumbnail} alt={video.title} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Play className="w-6 h-6 text-white/50" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium line-clamp-2" style={{ color: theme.text }}>{video.title}</h4>
                    <p className="text-xs mt-1" style={{ color: theme.textMuted }}>{video.channel}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: theme.textMuted }} />
                </div>
              </div>
            ))}
            {!searchModal.loading && searchModal.activeTab === "web" && searchModal.results.length === 0 && searchModal.query && (
              <p className="text-center text-sm py-8" style={{ color: theme.textMuted }}>No web results found. Try a different query.</p>
            )}
            {!searchModal.loading && searchModal.activeTab === "youtube" && searchModal.videos.length === 0 && searchModal.query && (
              <p className="text-center text-sm py-8" style={{ color: theme.textMuted }}>No videos found. Try a different query.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform overflow-hidden" style={{ background: theme.primary, boxShadow: theme.shadow }} aria-label="Open Joy AI">
        <Image src="/joy-logo.png" alt="Joy" width={32} height={32} className="object-contain" onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = "none"; el.nextElementSibling?.classList.remove("hidden"); }} />
        <Bot className="w-7 h-7 hidden" style={{ color: theme.textInverse }} />
      </button>
    );
  }

  return (
    <div className={cn("fixed z-50 flex flex-col overflow-hidden transition-all duration-300", isFullScreen ? "inset-0 rounded-none" : "bottom-4 right-4 w-[400px] h-[600px] rounded-2xl shadow-2xl")} style={{ background: theme.background, boxShadow: isFullScreen ? "none" : theme.shadow, border: `1px solid ${theme.border}` }} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
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
            <Image src="/joy-logo.png" alt="Joy" width={24} height={24} className="object-contain" onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = "none"; el.nextElementSibling?.classList.remove("hidden"); }} />
            <Bot className="w-5 h-5 text-white hidden" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Joy AI</h3>
            <p className="text-xs text-white/70">Powered by Aevibron</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSidebar((p) => !p)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Conversations"><MessageSquarePlus className="w-4 h-4 text-white" /></button>
          <button onClick={() => setShowSettings((p) => !p)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Settings"><Settings className="w-4 h-4 text-white" /></button>
          <button onClick={() => setIsFullScreen((p) => !p)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title={isFullScreen ? "Exit Full Screen" : "Full Screen"}>{isFullScreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}</button>
          <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Close"><X className="w-4 h-4 text-white" /></button>
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
              <div key={conv.id} onClick={() => { selectConversation(conv); setShowSidebar(false); }} className={cn("group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors", currentConversation?.id === conv.id ? "font-medium" : "")} style={{ background: currentConversation?.id === conv.id ? theme.primaryLight + "20" : "transparent", color: currentConversation?.id === conv.id ? theme.primary : theme.text }}>
                <ChevronLeft className="w-3 h-3 shrink-0 opacity-50" />
                <span className="truncate text-sm flex-1">{conv.title}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); updateConversation(conv.id, { is_pinned: !conv.is_pinned }); }} className="p-1 rounded hover:bg-black/5"><Pin className={cn("w-3 h-3", conv.is_pinned ? "fill-current" : "")} /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3 h-3 text-red-500" /></button>
                </div>
              </div>
            ))}
            {conversations.length === 0 && <p className="text-xs text-center py-4" style={{ color: theme.textMuted }}>No conversations yet</p>}
          </div>
        </div>
      )}

      {/* Settings Panel */}
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

      {/* Messages Area */}
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
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: theme.primary + "15" }}>
              <Image src="/joy-logo.png" alt="Joy" width={20} height={20} className="object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <Bot className="w-4 h-4 hidden" style={{ color: theme.primary }} />
            </div>
            <div className="max-w-[80%]">
              <div className="px-4 py-2.5 rounded-2xl rounded-bl-md text-sm" style={{ background: theme.assistantBubble, color: theme.assistantBubbleText }}>
                <div className={cn("prose prose-sm max-w-none", fontSizeClass)}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading && !isStreaming && <ThinkingIndicator />}

        {suggestions.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-2 pl-11">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSend(s)} className="px-3 py-1.5 rounded-full text-xs border transition-all hover:scale-105" style={{ background: theme.surface, borderColor: theme.border, color: theme.text }}>{s}</button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Chips */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-2 shrink-0 border-t" style={{ borderColor: theme.border, background: theme.background }}>
          {attachments.map((att) => (
            <AttachmentChip key={att.id} attachment={att} formatFileSize={formatFileSize} onRemove={removeAttachment} onPreview={setPreviewAttachment} onUpload={retryUpload} theme={theme} />
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 shrink-0 border-t" style={{ borderColor: theme.border, background: theme.background }}>
        {showLinkInput && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <Link2 className="w-4 h-4 shrink-0" style={{ color: theme.primary }} />
            <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitLink()} placeholder="Paste a link..." className="flex-1 text-xs bg-transparent outline-none" style={{ color: theme.text }} autoFocus />
            <button onClick={submitLink} className="px-2 py-1 rounded-lg text-xs font-medium text-white" style={{ background: theme.primary }}>Add</button>
            <button onClick={() => setShowLinkInput(false)} className="p-1 rounded hover:bg-black/5"><X className="w-3 h-3" style={{ color: theme.textMuted }} /></button>
          </div>
        )}

        {showPollInput && (
          <div className="mb-2 p-3 rounded-xl space-y-2" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <input type="text" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Poll question..." className="w-full px-3 py-2 rounded-lg text-xs border outline-none" style={{ background: theme.background, borderColor: theme.border, color: theme.text }} autoFocus />
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={opt} onChange={(e) => { const next = [...pollOptions]; next[i] = e.target.value; setPollOptions(next); }} placeholder={`Option ${i + 1}`} className="flex-1 px-3 py-1.5 rounded-lg text-xs border outline-none" style={{ background: theme.background, borderColor: theme.border, color: theme.text }} />
                {pollOptions.length > 2 && <button onClick={() => setPollOptions((prev) => prev.filter((_, idx) => idx !== i))} className="p-1 rounded hover:bg-red-50"><X className="w-3 h-3 text-red-500" /></button>}
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

        {showAttachmentMenu && (
          <div ref={attachmentMenuRef} className="absolute bottom-16 right-4 z-30">
            <BottomSheet isOpen={showAttachmentMenu} onClose={() => setShowAttachmentMenu(false)} onCamera={handleCamera} onPhotos={handlePhotos} onDocuments={handleDocuments} onScanner={handleScanner} onVoice={() => { toggleVoice(); setShowAttachmentMenu(false); }} onWhiteboard={handleWhiteboardOpen} onPoll={handlePoll} onLink={handleLink} onSearch={() => { setSearchModal((s) => ({ ...s, isOpen: true })); setShowAttachmentMenu(false); }} theme={theme} />
          </div>
        )}
      </div>

      <SearchModal />

      {previewAttachment && <AttachmentPreview attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} onUpdate={updateAttachment} theme={theme} />}

      {showWhiteboard && (
        <div className="absolute inset-0 z-50 flex flex-col" style={{ background: theme.background }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2">
              <PenTool className="w-4 h-4" style={{ color: theme.primary }} />
              <span className="font-medium text-sm" style={{ color: theme.text }}>Whiteboard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button onClick={() => setWhiteboardTool("pen")} className="p-1.5 rounded" style={{ background: whiteboardTool === "pen" ? theme.primary + "20" : "transparent" }}><PenTool className="w-3.5 h-3.5" style={{ color: whiteboardTool === "pen" ? theme.primary : theme.textMuted }} /></button>
                <button onClick={() => setWhiteboardTool("eraser")} className="p-1.5 rounded" style={{ background: whiteboardTool === "eraser" ? theme.primary + "20" : "transparent" }}><Eraser className="w-3.5 h-3.5" style={{ color: whiteboardTool === "eraser" ? theme.primary : theme.textMuted }} /></button>
              </div>
              <div className="w-px h-5" style={{ background: theme.border }} />
              <input type="color" value={whiteboardColor} onChange={(e) => setWhiteboardColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer" />
              <input type="range" min="1" max="20" value={whiteboardSize} onChange={(e) => setWhiteboardSize(Number(e.target.value))} className="w-16" />
              <div className="w-px h-5" style={{ background: theme.border }} />
              <button onClick={handleWhiteboardUndo} className="p-1.5 rounded hover:bg-black/5" title="Undo"><Undo className="w-3.5 h-3.5" style={{ color: theme.textMuted }} /></button>
              <button onClick={handleWhiteboardClear} className="p-1.5 rounded hover:bg-red-50" title="Clear"><Trash className="w-3.5 h-3.5 text-red-500" /></button>
              <button onClick={handleWhiteboardSave} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: theme.primary }}>Save</button>
              <button onClick={() => setShowWhiteboard(false)} className="p-1.5 rounded hover:bg-black/5"><X className="w-4 h-4" style={{ color: theme.textMuted }} /></button>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-hidden">
            <canvas ref={whiteboardCanvasRef} width={800} height={500} className="w-full h-full rounded-xl border cursor-crosshair touch-none" style={{ background: "#ffffff", borderColor: theme.border }} onMouseDown={handleWhiteboardStart} onMouseMove={handleWhiteboardMove} onMouseUp={handleWhiteboardEnd} onMouseLeave={handleWhiteboardEnd} onTouchStart={handleWhiteboardStart} onTouchMove={handleWhiteboardMove} onTouchEnd={handleWhiteboardEnd} />
          </div>
        </div>
      )}

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

// Helper components for ReactMarkdown
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
