"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Calendar, Plus, Trash2, Clock, MapPin, Loader2 } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  event_type: string;
  target_audience: string;
  target_grade: string | null;
  campus_id: string | null;
  created_by: string;
}

export default function CalendarManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    event_type: "general",
    target_audience: "all",
    target_grade: "",
    campus_id: "",
  });

  useEffect(() => {
    if (!loading && user?.user_category !== "staff" && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.user_category === "staff" || user?.user_category === "admin") {
      fetchEvents();
    }
  }, [user]);

  async function fetchEvents() {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create");
      setShowForm(false);
      setForm({ title: "", description: "", start_date: "", end_date: "", event_type: "general", target_audience: "all", target_grade: "", campus_id: "" });
      fetchEvents();
    } catch (err) {
      alert("Failed to create event");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event?")) return;
    try {
      const res = await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchEvents();
    } catch (err) {
      alert("Failed to delete");
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-bdja-primary animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "staff" && user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar Management</h1>
          <p className="text-gray-500">Manage school events and calendar</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Event</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event Title *" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="general">General</option>
              <option value="academic">Academic</option>
              <option value="sports">Sports</option>
              <option value="cultural">Cultural</option>
              <option value="holiday">Holiday</option>
              <option value="exam">Exam</option>
            </select>
            <input type="datetime-local" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <select value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="all">All</option>
              <option value="students">Students</option>
              <option value="staff">Staff</option>
              <option value="parents">Parents</option>
            </select>
            <input type="text" value={form.target_grade} onChange={(e) => setForm({ ...form, target_grade: e.target.value })} placeholder="Target Grade" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="text" value={form.campus_id} onChange={(e) => setForm({ ...form, campus_id: e.target.value })} placeholder="Campus ID" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3} className="md:col-span-2 w-full px-3 py-2 border border-gray-300 rounded-lg resize-none" />
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving..." : "Save Event"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        {fetching ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No events scheduled.</div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-start justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{ev.title}</h4>
                    <p className="text-xs text-gray-500">{ev.event_type} · {formatDate(ev.start_date)}</p>
                    {ev.target_grade && <p className="text-xs text-gray-400 mt-1">Grade: {ev.target_grade}</p>}
                    {ev.description && <p className="text-xs text-gray-400 mt-1">{ev.description}</p>}
                  </div>
                </div>
                <button onClick={() => handleDelete(ev.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
