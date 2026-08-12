"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, User, Loader2, AlertCircle } from "lucide-react";

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

export default function StudentTimetablePage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDay, setActiveDay] = useState("Monday");

  useEffect(() => {
    async function fetchTimetable() {
      try {
        const res = await fetch("/api/calendar?event_type=timetable");
        if (!res.ok) throw new Error("Failed to fetch timetable");
        const data = await res.json();
        setEntries(data.events || []);
      } catch (err: any) {
        setError(err.message || "Could not load timetable");
      } finally {
        setLoading(false);
      }
    }
    fetchTimetable();
  }, []);

  const dayEntries = entries
    .filter((e) => e.day_of_week === activeDay)
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Timetable</h1>
        <p className="text-gray-500">View your class schedule</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeDay === day
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {dayEntries.length === 0 && !error && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No classes on {activeDay}</h3>
          <p className="text-gray-400 mt-1">Enjoy your free time or check another day.</p>
        </div>
      )}

      <div className="space-y-3">
        {dayEntries.map((entry) => (
          <div key={entry.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-lg bg-blue-100 text-blue-600 flex flex-col items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
              <span className="text-xs font-medium mt-0.5">{entry.start_time?.slice(0, 5)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{entry.subject_name}</h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
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
            <div className="text-sm text-gray-400 shrink-0 font-medium">
              {entry.start_time?.slice(0, 5)} — {entry.end_time?.slice(0, 5)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
