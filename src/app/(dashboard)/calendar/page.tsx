"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2, Edit3 } from "lucide-react";
import toast from "react-hot-toast";

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    event_type: "academic",
    target_audience: "all",
    target_grade: "",
  });
  const [loading, setLoading] = useState(true);

  const canEdit = user ? hasPermission(user.role, "editCalendar") : false;

  useEffect(() => {
    if (!user) return;
    loadEvents();
  }, [user]);

  const loadEvents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .order("start_date");
    setEvents(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) { toast.error("No permission"); return; }

    const payload = {
      ...formData,
      created_by: user?.id,
      end_date: formData.end_date || null,
      target_grade: formData.target_grade || null,
    };

    if (editingEvent) {
      const { error } = await supabase.from("calendar_events").update(payload).eq("id", editingEvent.id);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Event updated");
    } else {
      const { error } = await supabase.from("calendar_events").insert(payload);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Event created");
    }

    setIsModalOpen(false);
    setEditingEvent(null);
    setFormData({ title: "", description: "", start_date: "", end_date: "", event_type: "academic", target_audience: "all", target_grade: "" });
    loadEvents();
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this event?")) return;
    await supabase.from("calendar_events").delete().eq("id", id);
    toast.success("Event deleted");
    loadEvents();
  };

  const openEdit = (event: any) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      start_date: event.start_date.slice(0, 16),
      end_date: event.end_date ? event.end_date.slice(0, 16) : "",
      event_type: event.event_type,
      target_audience: event.target_audience,
      target_grade: event.target_grade || "",
    });
    setIsModalOpen(true);
  };

  const eventColors: Record<string, string> = {
    academic: "border-l-4 border-blue-500",
    sports: "border-l-4 border-green-500",
    religious: "border-l-4 border-yellow-500",
    meeting: "border-l-4 border-purple-500",
    holiday: "border-l-4 border-red-500",
    examination: "border-l-4 border-orange-500",
    announcement: "border-l-4 border-gray-500",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bdja-dark">School Calendar</h1>
          <p className="text-gray-500 text-sm mt-1">All school events and activities</p>
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => { setEditingEvent(null); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Event
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-400">No events scheduled yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id} className={`${eventColors[event.event_type]} card-hover`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-bdja-dark">{event.title}</h3>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 capitalize">{event.event_type}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 capitalize">{event.target_audience}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(event.start_date)}
                      {event.end_date && ` - ${formatDate(event.end_date)}`}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 ml-4">
                      <button onClick={() => openEdit(event)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <Edit3 className="w-4 h-4 text-gray-500" />
                      </button>
                      <button onClick={() => handleDelete(event.id)} className="p-1.5 hover:bg-red-100 rounded-lg">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEvent ? "Edit Event" : "Add Event"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary text-sm min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
              <Input type="datetime-local" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End (optional)</label>
              <Input type="datetime-local" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <Select value={formData.event_type} onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}>
                {["academic", "sports", "religious", "meeting", "holiday", "examination", "announcement"].map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
              <Select value={formData.target_audience} onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}>
                {["all", "students", "parents", "staff", "specific_grade"].map((a) => (
                  <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                ))}
              </Select>
            </div>
          </div>
          <Button type="submit" variant="primary" className="w-full">{editingEvent ? "Update" : "Create"} Event</Button>
        </form>
      </Modal>
    </div>
  );
}
