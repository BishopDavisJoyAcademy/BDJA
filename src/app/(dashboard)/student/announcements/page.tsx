"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Bell,
  Loader2,
  AlertCircle,
  FileText,
  GraduationCap,
  Users,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const GOLD = "#D4AF37";

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  event_type: string;
  target_audience: string;
  target_grade: string | null;
  created_by: string;
  attachments: unknown | null;
  created_at: string;
}

const typeConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Megaphone }> = {
  announcement: { label: "Announcement", color: GOLD, bg: "rgba(212, 175, 55, 0.15)", border: "rgba(212, 175, 55, 0.3)", icon: Megaphone },
  event: { label: "Event", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.3)", icon: Calendar },
  exam: { label: "Exam", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)", icon: FileText },
  holiday: { label: "Holiday", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)", border: "rgba(34, 197, 94, 0.3)", icon: Clock },
  meeting: { label: "Meeting", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)", border: "rgba(168, 85, 247, 0.3)", icon: Users },
};

export default function StudentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch("/api/announcements", { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch announcements");
      }
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load announcements");
      toast.error(getErrorMessage(err) || "Could not load announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const filtered = filter === "all"
    ? announcements
    : announcements.filter((a) => a.event_type === filter);

  const unreadCount = announcements.filter((a) => {
    const created = new Date(a.created_at);
    const now = new Date();
    return (now.getTime() - created.getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-8 h-8" style={{ color: GOLD }} />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={fetchAnnouncements} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: `${GOLD}15`, color: GOLD }}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Announcements</h1>
          <p className="text-sm text-slate-400 mt-1">Stay updated with school news and events</p>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
            <Bell className="w-4 h-4" style={{ color: GOLD }} />
            <span className="text-sm font-medium" style={{ color: GOLD }}>{unreadCount} new</span>
          </div>
        )}
      </motion.div>

      {/* Filter tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "announcement", label: "Announcements" },
          { key: "event", label: "Events" },
          { key: "exam", label: "Exams" },
          { key: "holiday", label: "Holidays" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === f.key
                ? "text-white"
                : "text-slate-400 bg-slate-800/50 border border-slate-700/50 hover:text-white hover:bg-slate-700/50"
            }`}
            style={filter === f.key ? { background: `${GOLD}20`, border: `1px solid ${GOLD}40`, color: GOLD } : {}}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* Announcements list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-slate-900/60 border border-slate-700/50 rounded-2xl">
            <Megaphone className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No announcements found</p>
          </motion.div>
        ) : (
          filtered.map((announcement, i) => {
            const cfg = typeConfig[announcement.event_type] || typeConfig.announcement;
            const isExpanded = expandedId === announcement.id;
            const isNew = (new Date().getTime() - new Date(announcement.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;

            return (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.03 }}
                className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : announcement.id)}
                  className="w-full p-4 flex items-start gap-4 text-left"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                  >
                    <cfg.icon className="w-5 h-5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-white truncate">{announcement.title}</h3>
                      {isNew && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase" style={{ background: `${GOLD}20`, color: GOLD }}>
                          New
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(announcement.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                      {announcement.target_grade && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          {announcement.target_grade}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0">
                        <div className="pl-14">
                          {announcement.description && (
                            <p className="text-sm text-slate-300 leading-relaxed mb-3">{announcement.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-[11px] text-slate-500">
                            {announcement.end_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Ends {new Date(announcement.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                            <span>Posted {new Date(announcement.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
