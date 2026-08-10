"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Calendar, Clock, MapPin, Loader2 } from "lucide-react";

interface TimetableEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  event_type: string;
  target_audience: string;
  target_grade: string | null;
}

export default function TimetablePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<TimetableEvent[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) fetchTimetable();
  }, [user]);

  async function fetchTimetable() {
    try {
      setFetching(true);
      const res = await fetch("/api/calendar");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  }

  // Group by date
  const grouped: Record<string, TimetableEvent[]> = {};
  events.forEach((ev) => {
    const date = new Date(ev.start_date).toDateString();
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(ev);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
        <p className="text-gray-500">View your class schedule and upcoming events</p>
      </div>

      <Card className="p-6">
        {fetching ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No scheduled events.</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, dayEvents]) => (
              <div key={date}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{formatDate(dayEvents[0].start_date)}</h3>
                <div className="space-y-2">
                  {dayEvents.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                      <div className="w-16 text-center flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900">{formatTime(ev.start_date)}</p>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{ev.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          {ev.target_grade && <span className="text-xs text-gray-500">Grade {ev.target_grade}</span>}
                          <span className="text-xs text-gray-400 capitalize">{ev.event_type}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
