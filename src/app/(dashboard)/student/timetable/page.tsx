"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, MapPin, User, Loader2, AlertCircle,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

const GOLD = "#D4AF37";

interface TimetableEntry {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_name?: string;
  room?: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function StudentTimetablePage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDay, setActiveDay] = useState("Monday");

  useEffect(() => {
    async function fetchTimetable() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
        const res = await fetch("/api/calendar?event_type=timetable", { headers });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch timetable (${res.status})`);
        }
        const data = await res.json();
        setEntries(data.events || []);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Could not load timetable. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    fetchTimetable();
  }, []);

  const dayEntries = entries
    .filter((e) => e.day_of_week === activeDay)
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Timetable</h1>
          <p className="text-sm text-slate-400 mt-0.5">View your weekly class schedule</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5" style={{ color: GOLD }} />
          <span>{entries.length} Classes</span>
        </div>
      </motion.div>

      {/* Day selector */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex gap-2 overflow-x-auto pb-1">
        {DAYS.map((day) => {
          const dayCount = entries.filter((e) => e.day_of_week === day).length;
          return (
            <button key={day} onClick={() => setActiveDay(day)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                activeDay === day ? "text-slate-950" : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800"
              }`}
              style={activeDay === day ? { background: GOLD, border: `1px solid ${GOLD}` } : undefined}>
              {DAY_SHORT[DAYS.indexOf(day)]}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeDay === day ? "bg-slate-950/15 text-slate-950" : "bg-slate-700/50 text-slate-500"}`}>
                {dayCount}
              </span>
            </button>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-xl flex items-start gap-2.5"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : dayEntries.length === 0 && !error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-16 bg-slate-900/50 border border-slate-700/50 rounded-2xl">
          <Calendar className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white">No classes on {activeDay}</h3>
          <p className="text-slate-500 text-sm mt-1">Enjoy your free time or check another day.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            <motion.div key={activeDay} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              {dayEntries.map((entry, i) => (
                <motion.div key={entry.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4 hover:border-slate-600/50 transition-colors">
                  <div className="w-14 h-14 rounded-xl bg-slate-800/80 border border-slate-700/50 flex flex-col items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" style={{ color: GOLD }} />
                    <span className="text-[11px] font-medium text-slate-400 mt-0.5">{entry.start_time?.slice(0, 5)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm">{entry.subject_name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      {entry.teacher_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {entry.teacher_name}
                        </span>
                      )}
                      {entry.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          Room {entry.room}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500 shrink-0 font-medium">
                    {entry.start_time?.slice(0, 5)} — {entry.end_time?.slice(0, 5)}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
