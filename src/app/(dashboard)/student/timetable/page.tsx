"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase-client";
import SchoolDocumentHeader from "@/components/SchoolDocumentHeader";
import {
  CalendarDays, Clock, MapPin, User, Printer, Loader2, BookOpen
} from "lucide-react";

const GOLD = "#D4AF37";

interface TimetableSlot {
  id: string;
  subject_name: string;
  subject_id: string | null;
  teacher_id: string | null;
  room: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  profiles?: { full_name: string | null } | null;
  subjects?: { id: string; name: string; code: string | null; color: string | null } | null;
}

interface TimetableConfig {
  school_days: string[];
  time_slots: string[];
  lesson_duration_minutes: number;
  terms: string[];
  academic_year: string | null;
}

export default function StudentTimetablePage() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [config, setConfig] = useState<TimetableConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [showPrint, setShowPrint] = useState(false);

  const getHeaders = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
    return headers;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const headers = await getHeaders();
        const [ttRes, cfgRes] = await Promise.all([
          fetch("/api/timetable", { headers }),
          fetch("/api/admin/timetable-config", { headers }),
        ]);
        const ttData = await ttRes.json();
        const cfgData = await cfgRes.json();

        if (ttData.timetable) setSlots(ttData.timetable);
        if (cfgData.config) {
          setConfig(cfgData.config);
          setSelectedTerm(cfgData.config.terms?.[0] || "");
        }
      } catch (err: unknown) {
        toast.error("Failed to load timetable");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getHeaders]);

  const getSubjectColor = (slot: TimetableSlot) => {
    if (slot.subjects?.color) return slot.subjects.color;
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];
    let hash = 0;
    for (let i = 0; i < slot.subject_name.length; i++) hash = slot.subject_name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getSubjectBg = (slot: TimetableSlot) => {
    const c = getSubjectColor(slot);
    return `rgba(${parseInt(c.slice(1, 3), 16)}, ${parseInt(c.slice(3, 5), 16)}, ${parseInt(c.slice(5, 7), 16)}, 0.12)`;
  };

  const getSubjectBorder = (slot: TimetableSlot) => {
    const c = getSubjectColor(slot);
    return `rgba(${parseInt(c.slice(1, 3), 16)}, ${parseInt(c.slice(3, 5), 16)}, ${parseInt(c.slice(5, 7), 16)}, 0.35)`;
  };

  const days = config?.school_days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timeSlots = config?.time_slots || ["08:00", "08:40", "09:20", "10:00", "10:40", "11:20", "12:00", "12:40", "13:20", "14:00", "14:40", "15:20"];
  const terms = config?.terms || ["Term 1", "Term 2", "Term 3"];

  const filteredSlots = slots.filter((s) => s.term === selectedTerm || !selectedTerm);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6" style={{ color: GOLD }} /> My Timetable
          </h1>
          <p className="text-sm text-slate-400 mt-1">View your class schedule for the current term.</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
          >
            {terms.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={() => setShowPrint(true)}
            disabled={filteredSlots.length === 0}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-slate-700/50 hover:bg-slate-800/50 transition-all flex items-center gap-2 disabled:opacity-30"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {filteredSlots.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-12 text-center">
          <CalendarDays className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">No timetable available</h3>
          <p className="text-sm text-slate-600 mt-2">Your class timetable has not been published yet. Please check back later.</p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">Time</th>
                  {days.map((day) => (
                    <th key={day} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[140px]">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time) => (
                  <tr key={time} className="border-b border-slate-700/30 hover:bg-slate-800/20">
                    <td className="px-3 py-2 text-xs font-mono text-slate-400 whitespace-nowrap">{time}</td>
                    {days.map((_, dayIndex) => {
                      const slot = filteredSlots.find((s) => s.day_of_week === dayIndex && s.start_time === time);
                      return (
                        <td key={`${time}-${dayIndex}`} className="px-2 py-2 align-top">
                          {slot ? (
                            <div
                              className="rounded-xl p-2.5 border"
                              style={{ backgroundColor: getSubjectBg(slot), borderColor: getSubjectBorder(slot) }}
                            >
                              <p className="text-xs font-semibold text-white">{slot.subject_name}</p>
                              {slot.profiles?.full_name && (
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <User className="w-2.5 h-2.5" /> {slot.profiles.full_name}
                                </p>
                              )}
                              {slot.room && (
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-2.5 h-2.5" /> {slot.room}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="h-8" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print Preview */}
      {showPrint && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="max-w-5xl mx-auto p-8">
            <div className="no-print flex justify-end gap-2 mb-4">
              <button onClick={() => setShowPrint(false)} className="px-4 py-2 rounded-xl text-sm text-slate-600 border border-slate-300 hover:bg-slate-100">Close</button>
              <button onClick={() => window.print()} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-950" style={{ background: GOLD }}>
                <Printer className="w-4 h-4 inline mr-1" /> Print
              </button>
            </div>
            <SchoolDocumentHeader title="Student Timetable" subtitle={`${selectedTerm} ${config?.academic_year || ""}`} />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-900 uppercase w-20">Time</th>
                    {days.map((day) => (
                      <th key={day} className="px-3 py-2 text-left text-xs font-bold text-slate-900 uppercase">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time) => (
                    <tr key={time} className="border-b border-slate-200">
                      <td className="px-3 py-2 text-xs font-mono text-slate-600">{time}</td>
                      {days.map((_, dayIndex) => {
                        const slot = filteredSlots.find((s) => s.day_of_week === dayIndex && s.start_time === time);
                        return (
                          <td key={`${time}-${dayIndex}`} className="px-2 py-2 align-top">
                            {slot ? (
                              <div className="rounded-lg p-2 border" style={{ backgroundColor: getSubjectBg(slot), borderColor: getSubjectBorder(slot) }}>
                                <p className="text-xs font-semibold text-slate-900">{slot.subject_name}</p>
                                {slot.room && <p className="text-[10px] text-slate-600">Room: {slot.room}</p>}
                              </div>
                            ) : (
                              <div className="h-8" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-300 text-[10px] text-slate-500 text-center">
              Bishop Davis Joy Academy — Official Student Timetable
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
