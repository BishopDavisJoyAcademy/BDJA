"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/hooks/useStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Send, X, Bot, User, Play, Clock, Bookmark, BookmarkCheck, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  voraResults?: any[];
  youtubeResults?: any[];
  timestamp: string;
}

interface VoraResult {
  id: string;
  title: string;
  subject?: string;
  grade_level?: string;
  youtube_url: string;
  summary?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  difficulty?: string;
  tags?: string[];
}

export default function JoyChat() {
  const { user } = useAuth();
  const { joyOpen, setJoyOpen } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: "Hello! I'm Joy, your BDJA learning assistant. Ask me anything about your studies, school life, or faith!", timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedVideoIds, setSavedVideoIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.filter(m => m.id !== "welcome").concat(userMsg).map(m => ({ role: m.role, content: m.content })),
          context: { userName: user?.full_name, grade_level: (user as any)?.grade_level, userRole: user?.role },
          stream: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response");

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.choices?.[0]?.message?.content || "I'm not sure about that. Could you rephrase?",
        voraResults: data.vora_results || [],
        youtubeResults: data.youtube_results || [],
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const saveVideo = async (video: VoraResult) => {
    try {
      const res = await fetch("/api/vora/saved-videos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: video.id, title: video.title, subject: video.subject,
          grade_level: video.grade_level, youtube_url: video.youtube_url,
          summary: video.summary, thumbnail_url: video.thumbnail_url,
          duration_seconds: video.duration_seconds, difficulty: video.difficulty,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSavedVideoIds(prev => new Set(prev).add(video.id));
      toast.success("Saved to your library!");
    } catch (err: any) { toast.error(err.message); }
  };

  const formatDuration = (s?: number) => {
    if (!s) return "";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!joyOpen) {
    return (
      <button onClick={() => setJoyOpen(true)} className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-bdja-secondary rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform" aria-label="Open Joy AI">
        <Sparkles className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
      <div className="bg-gradient-to-r from-bdja-primary to-bdja-accent px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
          <div><h3 className="text-white font-semibold text-sm">Joy AI</h3><p className="text-white/70 text-xs">BDJA Learning Assistant</p></div>
        </div>
        <button onClick={() => setJoyOpen(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-bdja-secondary" : "bg-bdja-primary"}`}>
              {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-bdja-secondary text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"}`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.voraResults && msg.voraResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-bdja-primary">Recommended from VORA:</p>
                  {msg.voraResults.map((v: VoraResult) => (
                    <div key={v.id} className="bg-white rounded-lg p-2 border border-gray-200">
                      <div className="flex gap-2">
                        {v.thumbnail_url && <img src={v.thumbnail_url} alt="" className="w-20 h-14 object-cover rounded" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{v.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {v.duration_seconds && <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><Clock className="w-3 h-3" />{formatDuration(v.duration_seconds)}</span>}
                            {v.difficulty && <span className="text-[10px] bg-purple-50 text-purple-700 px-1 rounded capitalize">{v.difficulty}</span>}
                          </div>
                          {v.summary && <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{v.summary}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <a href={`/vora?video=${v.id}`} target="_blank" className="text-[10px] bg-bdja-primary text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-bdja-accent"><Play className="w-3 h-3" /> Watch</a>
                        <button onClick={() => saveVideo(v)} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-gray-200">
                          {savedVideoIds.has(v.id) ? <BookmarkCheck className="w-3 h-3 text-bdja-secondary" /> : <Bookmark className="w-3 h-3" />}
                          {savedVideoIds.has(v.id) ? "Saved" : "Save"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {msg.youtubeResults && msg.youtubeResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500">Found online:</p>
                  {msg.youtubeResults.map((v: VoraResult) => (
                    <div key={v.id} className="bg-white rounded-lg p-2 border border-gray-200">
                      <div className="flex gap-2">
                        {v.thumbnail_url && <img src={v.thumbnail_url} alt="" className="w-20 h-14 object-cover rounded" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{v.title}</p>
                          {v.summary && <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{v.summary}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => window.open(v.youtube_url, "_blank")} className="text-[10px] bg-red-50 text-red-700 px-2 py-1 rounded flex items-center gap-1"><Play className="w-3 h-3" /> Watch on YouTube</button>
                        <button onClick={() => saveVideo(v)} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded flex items-center gap-1">
                          {savedVideoIds.has(v.id) ? <BookmarkCheck className="w-3 h-3 text-bdja-secondary" /> : <Bookmark className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-bdja-primary flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2">
              <div className="flex gap-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" /><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" /></div>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-gray-100 shrink-0">
        <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <Input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Joy anything..." className="flex-1 text-sm" />
          <Button type="submit" variant="primary" size="sm" isLoading={loading} disabled={!input.trim()}><Send className="w-4 h-4" /></Button>
        </form>
      </div>
    </div>
  );
}
