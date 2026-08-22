"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Plus, Trash2, Edit3, X, Save, Calendar as CalIcon, Filter, Download } from "lucide-react";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  event_type: string;
  target_audience: string;
  target_grade: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  color: string | null;
}

const EVENT_TYPES = [
  { value: "general", label: "General", color: "bg-gray-500" },
  { value: "academic", label: "Academic", color: "bg-blue-500" },
  { value: "sports", label: "Sports", color: "bg-emerald-500" },
  { value: "holiday", label: "Holiday", color: "bg-amber-500" },
  { value: "exam", label: "Examination", color: "bg-red-500" },
  { value: "meeting", label: "Meeting", color: "bg-purple-500" },
  { value: "cultural", label: "Cultural", color: "bg-pink-500" },
];

const TARGET_AUDIENCES = ["all", "students", "staff", "parents", "admin"];
const RECURRENCE_OPTIONS = ["none", "daily", "weekly", "monthly", "yearly"];

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterAudience, setFilterAudience] = useState("all");
  const [form, setForm] = useState<Partial<CalendarEvent>>({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    event_type: "general",
    target_audience: "all",
    target_grade: "",
    is_recurring: false,
    recurrence_rule: "none",
    color: "",
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ events: CalendarEvent[] }>("/api/calendar");
      setEvents(data.events || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      event_type: "general",
      target_audience: "all",
      target_grade: "",
      is_recurring: false,
      recurrence_rule: "none",
      color: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.start_date) {
      toast.error("Title and start date are required");
      return;
    }
    try {
      const body = {
        ...form,
        is_recurring: form.recurrence_rule !== "none" && form.recurrence_rule !== null,
      };
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/calendar?id=${editingId}` : "/api/calendar";
      const { data: { session: calSession } } = await supabase.auth.getSession();
      const calToken = calSession?.access_token || "";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${calToken}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(editingId ? "Failed to update event" : "Failed to create event");
      toast.success(editingId ? "Event updated" : "Event created");
      resetForm();
      setShowForm(false);
      fetchEvents();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      const { data: { session: delCalSession } } = await supabase.auth.getSession();
      const delCalToken = delCalSession?.access_token || "";
      const res = await fetch(`/api/calendar?id=${id}`, { method: "DELETE", credentials: "include", headers: { "Authorization": `Bearer ${delCalToken}` } });
      if (!res.ok) throw new Error("Failed to delete");
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success("Event deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleEdit = (evt: CalendarEvent) => {
    setForm({
      title: evt.title,
      description: evt.description || "",
      start_date: evt.start_date.slice(0, 16),
      end_date: evt.end_date ? evt.end_date.slice(0, 16) : "",
      event_type: evt.event_type,
      target_audience: evt.target_audience,
      target_grade: evt.target_grade || "",
      is_recurring: evt.is_recurring,
      recurrence_rule: evt.recurrence_rule || "none",
      color: evt.color || "",
    });
    setEditingId(evt.id);
    setShowForm(true);
  };

  const exportICS = () => {
    const icsEvents = filteredEvents.map((evt) => {
      const start = new Date(evt.start_date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const end = evt.end_date
        ? new Date(evt.end_date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
        : start;
      return "BEGIN:VEVENT\nUID:" + evt.id + "@school.ac.ke\nDTSTART:" + start + "\nDTEND:" + end + "\nSUMMARY:" + evt.title + "\nDESCRIPTION:" + (evt.description || "") + "\nEND:VEVENT";
    }).join("\n");
    const ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//BDJA//Calendar//EN\n" + icsEvents + "\nEND:VCALENDAR";
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bdja-calendar.ics";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar exported");
  };

  const getEventColor = (evt: CalendarEvent) => {
    if (evt.color) return evt.color;
    const type = EVENT_TYPES.find((t) => t.value === evt.event_type);
    return type ? type.color.replace("bg-", "text-") : "text-gray-400";
  };

  const getEventBg = (evt: CalendarEvent) => {
    const type = EVENT_TYPES.find((t) => t.value === evt.event_type);
    return type ? type.color.replace("bg-", "bg-") + "/10" : "bg-gray-500/10";
  };

  const filteredEvents = events.filter((e) => {
    if (filterType !== "all" && e.event_type !== filterType) return false;
    if (filterAudience !== "all" && e.target_audience !== filterAudience) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-sm text-gray-400 mt-1">Manage school events and academic calendar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportICS}>
            <Download className="w-4 h-4 mr-1" /> Export ICS
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> Add Event</>}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
            <option value="all">All Types</option>
            {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <select value={filterAudience} onChange={(e) => setFilterAudience(e.target.value)} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
          <option value="all">All Audiences</option>
          {TARGET_AUDIENCES.map((a) => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
        </select>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="font-semibold text-white mb-4">{editingId ? "Edit Event" : "New Event"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Title *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start Date *</label>
                <Input type="datetime-local" value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">End Date</label>
                <Input type="datetime-local" value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Event Type</label>
                <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                  {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Target Audience</label>
                <select value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                  {TARGET_AUDIENCES.map((a) => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Target Grade</label>
                <Input value={form.target_grade || ""} onChange={(e) => setForm({ ...form, target_grade: e.target.value })} placeholder="e.g. Grade 5" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Recurrence</label>
                <select value={form.recurrence_rule || "none"} onChange={(e) => setForm({ ...form, recurrence_rule: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                  {RECURRENCE_OPTIONS.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm resize-y" placeholder="Event description..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit"><Save className="w-4 h-4 mr-1" />{editingId ? "Update Event" : "Save Event"}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {filteredEvents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <CalIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No events found.</p>
          </div>
        )}
        {filteredEvents.map((evt) => (
          <Card key={evt.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-medium text-white">{evt.title}</h3>
                  <Badge className={`${getEventBg(evt)} ${getEventColor(evt)} border-0 text-xs`}>
                    {EVENT_TYPES.find((t) => t.value === evt.event_type)?.label || evt.event_type}
                  </Badge>
                  {evt.is_recurring && <Badge className="bg-purple-500/10 text-purple-400 border-0 text-xs">Recurring</Badge>}
                </div>
                <p className="text-sm text-gray-400">{new Date(evt.start_date).toLocaleString()}{evt.end_date ? ` - ${new Date(evt.end_date).toLocaleString()}` : ""}</p>
                <p className="text-xs text-gray-500 mt-1">Audience: {evt.target_audience}{evt.target_grade ? ` · Grade: ${evt.target_grade}` : ""}</p>
                {evt.description && <p className="text-sm text-gray-300 mt-2">{evt.description}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => handleEdit(evt)}><Edit3 className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(evt.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
