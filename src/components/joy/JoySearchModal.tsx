"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Search, X, Globe, Youtube, Play, ExternalLink, Loader2 } from "lucide-react";
import { ThemeConfig } from "@/lib/joy-themes";
import { JoySearchResult, JoyVideoResult } from "@/types/joy";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface JoySearchModalProps {
  isOpen: boolean;
  theme: ThemeConfig;
  onClose: () => void;
  onInsertLink: (url: string, title?: string) => void;
}

export function JoySearchModal({ isOpen, theme, onClose, onInsertLink }: JoySearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JoySearchResult[]>([]);
  const [videos, setVideos] = useState<JoyVideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"web" | "youtube">("web");

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    setVideos([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch("/api/joy/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ query: query.trim(), source: activeTab, maxResults: 5 }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (activeTab === "youtube") {
        setVideos(json.results || []);
      } else {
        setResults(json.results || []);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [query, activeTab]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
        style={{ background: theme.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.border }}>
          <h3 className="font-semibold text-sm" style={{ color: theme.text }}>Search</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-black/5">
            <X className="w-4 h-4" style={{ color: theme.textMuted }} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.textMuted }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search the web or YouTube..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none focus:ring-2"
                style={{ background: theme.background, borderColor: theme.border, color: theme.text }}
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40"
              style={{ background: theme.primary }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("web")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors",
                activeTab === "web" ? "text-white" : ""
              )}
              style={{
                background: activeTab === "web" ? theme.primary : theme.background,
                borderColor: theme.border,
                color: activeTab === "web" ? "#fff" : theme.text,
              }}
            >
              <Globe className="w-3.5 h-3.5" /> Web
            </button>
            <button
              onClick={() => setActiveTab("youtube")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors",
                activeTab === "youtube" ? "text-white" : ""
              )}
              style={{
                background: activeTab === "youtube" ? theme.primary : theme.background,
                borderColor: theme.border,
                color: activeTab === "youtube" ? "#fff" : theme.text,
              }}
            >
              <Youtube className="w-3.5 h-3.5" /> YouTube
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {activeTab === "web" && results.map((r, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border hover:border-current transition-colors cursor-pointer"
              style={{ background: theme.background, borderColor: theme.border }}
              onClick={() => { onInsertLink(r.url, r.title); onClose(); }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-3 h-3 shrink-0" style={{ color: theme.primary }} />
                <span className="text-xs font-medium truncate" style={{ color: theme.text }}>{r.title}</span>
              </div>
              <p className="text-[11px] line-clamp-2" style={{ color: theme.textMuted }}>{r.snippet}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] truncate" style={{ color: theme.primary }}>{r.url}</span>
                <ExternalLink className="w-3 h-3 shrink-0" style={{ color: theme.textMuted }} />
              </div>
            </div>
          ))}

          {activeTab === "youtube" && videos.map((v, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border hover:border-current transition-colors cursor-pointer flex gap-3"
              style={{ background: theme.background, borderColor: theme.border }}
              onClick={() => { onInsertLink(`https://youtube.com/watch?v=${v.videoId}`, v.title); onClose(); }}
            >
              <div className="w-20 h-14 rounded-lg bg-black/10 shrink-0 overflow-hidden relative">
                {v.thumbnail ? (
                  <Image src={v.thumbnail} alt={v.title} fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-5 h-5" style={{ color: theme.textMuted }} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: theme.text }}>{v.title}</p>
                <p className="text-[10px]" style={{ color: theme.textMuted }}>{v.channel}</p>
                {v.subject && <p className="text-[10px]" style={{ color: theme.primary }}>{v.subject} {v.gradeLevel}</p>}
              </div>
            </div>
          ))}

          {!loading && activeTab === "web" && results.length === 0 && query && (
            <p className="text-xs text-center py-4" style={{ color: theme.textMuted }}>No web results found</p>
          )}
          {!loading && activeTab === "youtube" && videos.length === 0 && query && (
            <p className="text-xs text-center py-4" style={{ color: theme.textMuted }}>No videos found</p>
          )}
        </div>
      </div>
    </div>
  );
}
