"use client";

import { useState, useEffect } from "react";
import { Calendar as CalIcon, Plus, Trash2, Edit3, X, Save, Loader2, AlertCircle, Clock, Users } from "lucide-react";
import { apiGet, apiPost, apiPut, apiFetch } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

interface CalendarEvent {
  id: string; title: string; description?: string; start_date: string; end_date?: string;
  event_type: string; target_audience: string; target_grade?: string; campus_id?: string;
}

const EVENT_TYPES = ["general", "academic", "sports", "cultural", "holiday", "exam", "meeting"];
const AUDIENCES = ["all", "students", "staff", "parents"];
const GRADES = ["All", "Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({ title: "", description: "", start_date: "", end_date: "", event_type: "general", target_audience: "all", target_grade: "", campus_id: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet("/api/calendar").then((d) => { setEvents(d.events || []); setLoading(false); }).catch((err) => { toast.error(getErrorMessage(err)); setLoading(false); });
  }, []);

  const resetForm = () => { setForm({ title: "", description: "", start_date: "", end_date: "", event_type: "general", target_audience: "all", target_grade: "", campus_id: "" }); setEditing(null); setShowForm(false); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); if (!form.title || !form.start_date) { toast.error("Title and start date are required"); return; }
    setSaving(true);
    try {
      if (editing) { await apiPut("/api/calendar", { id: editing.id, ...form }); toast.success("Event updated"); }
      else { await apiPost("/api/calendar", form); toast.success("Event created"); }
      resetForm(); const d = await apiGet("/api/calendar"); setEvents(d.events || []);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try { await apiFetch(`/api/calendar?id=${id}`, { method: "DELETE" }); toast.success("Event deleted"); setEvents((prev) => prev.filter((e) => e.id !== id)); } catch (err: unknown) { toast.error(getErrorMessage(err)); }
  };

  const typeColors: Record<string, string> = {
    general: "bg-blue-500/10 text-blue-400 border-blue-500/20", academic: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    sports: "bg-orange-500/10 text-orange-400 border-orange-500/20", cultural: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    holiday: "bg-amber-500/10 text-amber-400 border-amber-500/20", exam: "bg-red-500/10 text-red-400 border-red-500/20",
    meeting: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-white">Calendar</h1><p className="text-gray-400 mt-1">{events.length} events</p></div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20 font-medium"><Plus className="w-4 h-4" /> Add Event</button>
      </div>
      {showForm && (
        <form onSubmit={handleSave} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-white">{editing ? "Edit Event" : "New Event"}</h3><button type="button" onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300 mb-1.5">Title *</label><input required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Start Date *</label><input required type="datetime-local" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">End Date</label><input type="datetime-local" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
              <select value={form.event_type} onChange={(e) => setForm({...form, event_type: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50">{EVENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select>
            </div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Audience</label>
              <select value={form.target_audience} onChange={(e) => setForm({...form, target_audience: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50">{AUDIENCES.map((a) => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}</select>
            </div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Target Grade</label>
              <select value={form.target_grade} onChange={(e) => setForm({...form, target_grade: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50"><option value="">All Grades</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select>
            </div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Campus ID</label><input value={form.campus_id} onChange={(e) => setForm({...form, campus_id: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label><textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl border border-slate-600 text-gray-300 text-sm font-medium hover:bg-slate-700/50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? "Saving..." : "Save Event"}</button>
          </div>
        </form>
      )}
      <div className="space-y-3">
        {events.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()).map((evt) => (
          <div key={evt.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 flex items-start gap-4 hover:border-slate-600 transition-all">
            <div className="w-14 h-14 rounded-xl bg-slate-900 flex flex-col items-center justify-center border border-slate-700/50 shrink-0">
              <span className="text-xs text-gray-500 uppercase">{new Date(evt.start_date).toLocaleString("en", { month: "short" })}</span>
              <span className="text-lg font-bold text-white">{new Date(evt.start_date).getDate()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">{evt.title}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{evt.description || "No description"}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setEditing(evt); setForm({ title: evt.title, description: evt.description || "", start_date: evt.start_date.slice(0, 16), end_date: evt.end_date ? evt.end_date.slice(0, 16) : "", event_type: evt.event_type, target_audience: evt.target_audience, target_grade: evt.target_grade || "", campus_id: evt.campus_id || "" }); setShowForm(true); }} className="p-1.5 rounded-lg bg-slate-700/30 hover:bg-slate-700/60 text-gray-300 hover:text-white transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(evt.id)} className="p-1.5 rounded-lg bg-slate-700/30 hover:bg-red-500/20 text-gray-300 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${typeColors[evt.event_type] || typeColors.general}`}>{evt.event_type}</span>
                <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3 h-3" />{new Date(evt.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="flex items-center gap-1 text-xs text-gray-500"><Users className="w-3 h-3" />{evt.target_audience}</span>
                {evt.target_grade && <span className="text-xs text-gray-500">{evt.target_grade}</span>}
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && !showForm && <div className="text-center py-12 text-gray-500"><p>No events yet. Create your first event.</p></div>}
      </div>
    </div>
  );
}
