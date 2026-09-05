"use client";

import { useParentContext } from "@/contexts/ParentContext";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { Megaphone, Loader2, Pin, CalendarDays, Eye, EyeOff, Filter } from "lucide-react";

const GOLD = "#D4AF37";

const categoryColors: Record<string, string> = {
  general: "#D4AF37", academic: "#3b82f6", sports: "#22c55e", events: "#a855f7", fees: "#ef4444", safety: "#f97316", holiday: "#06b6d4",
};

const priorityColors: Record<string, string> = {
  low: "#64748b", normal: "#D4AF37", high: "#f97316", urgent: "#ef4444",
};

interface Announcement {
  id: string; title: string; content: string; category: string; priority: string;
  target_audience: string; published_at: string; is_pinned: boolean; is_read: boolean;
  profiles: { full_name: string; avatar_url: string | null } | null;
  classes: { name: string; grade_level: string } | null;
}

export default function ParentAnnouncements() {
  const { selectedChild } = useParentContext();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
      let url = "/api/parent/announcements";
      if (selectedChild) url += `?child_id=${selectedChild.student_id}`;
      if (categoryFilter !== "all") url += `${selectedChild ? "&" : "?"}category=${categoryFilter}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to fetch announcements");
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setLoading(false); }
  }, [selectedChild, categoryFilter]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const markAsRead = async (id: string) => {
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
      await fetch("/api/parent/announcements/read", { method: "POST", headers, body: JSON.stringify({ announcement_id: id }) });
      setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
    } catch { /* silent */ }
  };

  const categories = ["all", "general", "academic", "sports", "events", "fees", "safety", "holiday"];

  const filtered = announcements.filter((a) => {
    if (showUnreadOnly) return !a.is_read;
    return true;
  });

  const pinned = filtered.filter((a) => a.is_pinned);
  const regular = filtered.filter((a) => !a.is_pinned);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="text-slate-400 text-sm mt-1">School-wide and class updates</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white focus:outline-none focus:border-[#D4AF37]/30">
            {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <button onClick={() => setShowUnreadOnly(!showUnreadOnly)} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${showUnreadOnly ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25" : "bg-slate-800/50 text-slate-400 border border-slate-700/30"}`}>
            {showUnreadOnly ? "Show All" : "Unread Only"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Megaphone className="w-12 h-12 text-slate-700 mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No Announcements</h3>
          <p className="text-slate-500 text-sm">No announcements match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pinned.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} onRead={() => markAsRead(a.id)} />
          ))}
          {regular.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} onRead={() => markAsRead(a.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ announcement: a, onRead }: { announcement: Announcement; onRead: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const catColor = categoryColors[a.category] || "#D4AF37";
  const priColor = priorityColors[a.priority] || "#D4AF37";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl bg-slate-900/60 border p-5 transition-all ${a.is_pinned ? "border-[#D4AF37]/20" : "border-slate-700/50"} ${!a.is_read ? "ring-1 ring-[#D4AF37]/10" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {a.is_pinned && <Pin className="w-3.5 h-3.5" style={{ color: GOLD }} />}
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium border" style={{ background: `${catColor}15`, color: catColor, borderColor: `${catColor}25` }}>{a.category}</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium border" style={{ background: `${priColor}15`, color: priColor, borderColor: `${priColor}25` }}>{a.priority}</span>
            {!a.is_read && <span className="w-2 h-2 rounded-full" style={{ background: GOLD }} />}
          </div>
          <h3 className="text-sm font-semibold text-white">{a.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
            <CalendarDays className="w-3 h-3" />
            <span>{new Date(a.published_at).toLocaleDateString()}</span>
            {a.profiles?.full_name && <span>· By {a.profiles.full_name}</span>}
            {a.classes?.name && <span>· {a.classes.name}</span>}
          </div>
        </div>
        {!a.is_read && (
          <button onClick={onRead} className="p-1.5 rounded-lg hover:bg-slate-800/50 text-slate-500 hover:text-[#D4AF37] transition-colors shrink-0" title="Mark as read">
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className={`mt-3 text-sm text-slate-400 ${expanded ? "" : "line-clamp-2"}`}>{a.content}</div>
      {a.content.length > 120 && (
        <button onClick={() => setExpanded(!expanded)} className="mt-2 text-xs text-[#D4AF37] hover:underline">
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </motion.div>
  );
}
