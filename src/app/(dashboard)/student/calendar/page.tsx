"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, MapPin, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, CalendarDays, X
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

const GOLD = "#D4AF37";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  event_type: string;
  target_audience: string;
  target_grade: string | null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function StudentCalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
        const res = await fetch(`/api/calendar?start=${start}&end=${end}`);
        if (!res.ok) throw new Error("Failed to fetch calendar");
        const data = await res.json();
        setEvents(data.events || []);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Could not load calendar");
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [currentDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEventsForDay = (day: number) => {
    const dateStr = new Date(year, month, day).toDateString();
    return events.filter((e) => new Date(e.start_date).toDateString() === dateStr);
  };

  const eventTypeColors: Record<string, string> = {
    general: `${GOLD}30`,
    exam: "rgba(239,68,68,0.3)",
    holiday: "rgba(34,197,94,0.3)",
    meeting: "rgba(59,130,246,0.3)",
    timetable: "rgba(168,85,247,0.3)",
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">School Calendar</h1>
          <p className="text-sm text-slate-400 mt-0.5">View upcoming events and important dates</p>
        </div>
      </motion.div>

      {/* Calendar header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex items-center justify-between bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-white">{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
          <ChevronRight className="w-5 h-5" />
        </button>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl flex items-start gap-2.5"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-700/50">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-slate-500 uppercase">{d}</div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-slate-700/20" />
            ))}
            {Array.from({ length: daysInMonth }).map((day) => {
              const dayEvents = getEventsForDay(day + 1);
              const isToday = new Date().toDateString() === new Date(year, month, day + 1).toDateString();
              return (
                <motion.div
                  key={day}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                  className={`min-h-[80px] border-b border-r border-slate-700/20 p-1.5 cursor-pointer transition-colors ${isToday ? "bg-amber-500/5" : ""}`}
                  onClick={() => dayEvents.length > 0 && setSelectedEvent(dayEvents[0])}
                >
                  <span className={`text-xs font-medium ${isToday ? "text-amber-400" : "text-slate-400"}`}>{day + 1}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div key={ev.id} className="h-1.5 rounded-full" style={{ background: eventTypeColors[ev.event_type] || eventTypeColors.general }} />
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[9px] text-slate-600">+{dayEvents.length - 2} more</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Upcoming events list */}
      {!loading && events.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Upcoming Events</h3>
          {events.slice(0, 5).map((ev, i) => (
            <motion.div key={ev.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-colors cursor-pointer"
              onClick={() => setSelectedEvent(ev)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: eventTypeColors[ev.event_type] || eventTypeColors.general }}>
                  <CalendarDays className="w-5 h-5 text-white/80" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white text-sm">{ev.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{ev.description || "No description"}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ev.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">{ev.event_type}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Event detail modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{selectedEvent.title}</h3>
                <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-4">{selectedEvent.description || "No additional details."}</p>
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" style={{ color: GOLD }} />
                  <span>{new Date(selectedEvent.start_date).toLocaleString("en-GB")}</span>
                </div>
                {selectedEvent.end_date && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" style={{ color: GOLD }} />
                    <span>Ends: {new Date(selectedEvent.end_date).toLocaleString("en-GB")}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" style={{ color: GOLD }} />
                  <span className="capitalize">{selectedEvent.event_type} — {selectedEvent.target_audience}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
