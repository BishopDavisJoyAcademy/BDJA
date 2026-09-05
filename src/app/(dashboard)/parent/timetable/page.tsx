"use client";

import { useParentContext } from "@/contexts/ParentContext";
import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { Clock, Loader2, MapPin, User } from "lucide-react";

const GOLD = "#D4AF37";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

interface TimetableEntry {
  id: string; day_of_week: string; start_time: string; end_time: string; room: string | null; topic: string | null;
  subjects: { name: string; code: string } | null; profiles: { full_name: string } | null;
}

export default function ParentTimetable() {
  const { selectedChild } = useParentContext();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState("Monday");

  const fetchTimetable = useCallback(async () => {
    if (!selectedChild) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
      const res = await fetch(`/api/parent/timetable?child_id=${selectedChild.student_id}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch timetable");
      const data = await res.json();
      setEntries(data.timetable || []);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setLoading(false); }
  }, [selectedChild]);

  useEffect(() => { fetchTimetable(); }, [fetchTimetable]);

  const grouped = useMemo(() => {
    const map: Record<string, TimetableEntry[]> = {};
    DAYS.forEach((d) => map[d] = []);
    entries.forEach((e) => {
      const day = e.day_of_week;
      if (!map[day]) map[day] = [];
      map[day].push(e);
    });
    DAYS.forEach((d) => map[d].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [entries]);

  const todayEntries = grouped[activeDay] || [];

  if (!selectedChild) return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <Clock className="w-16 h-16 text-slate-700 mb-4" />
      <h2 className="text-xl font-semibold text-white mb-2">Select a Child</h2>
      <p className="text-slate-400 text-sm">Choose a child to view their timetable.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Class Timetable</h1>
        <p className="text-slate-400 text-sm mt-1">{selectedChild.full_name} · {selectedChild.class_name}</p>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {DAYS.map((day) => (
          <button key={day} onClick={() => setActiveDay(day)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${activeDay === day ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25" : "bg-slate-800/50 text-slate-400 border border-slate-700/30 hover:text-slate-200"}`}>
            {day}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} /></div>
      ) : todayEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Clock className="w-12 h-12 text-slate-700 mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No Classes</h3>
          <p className="text-slate-500 text-sm">No timetable entries for {activeDay}.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {todayEntries.map((e, i) => (
            <motion.div key={e.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-4 rounded-2xl bg-slate-900/60 border border-slate-700/50 p-4 hover:border-slate-600/50 transition-all">
              <div className="w-16 shrink-0 text-center">
                <p className="text-xs font-bold text-white">{e.start_time.slice(0, 5)}</p>
                <p className="text-[10px] text-slate-500">{e.end_time.slice(0, 5)}</p>
              </div>
              <div className="w-px h-10 bg-slate-700/50" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white">{e.subjects?.name || "Subject"}</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {e.profiles?.full_name && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500"><User className="w-3 h-3" />{e.profiles.full_name}</span>
                  )}
                  {e.room && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500"><MapPin className="w-3 h-3" />{e.room}</span>
                  )}
                </div>
                {e.topic && <p className="text-[11px] text-slate-500 mt-1">Topic: {e.topic}</p>}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
