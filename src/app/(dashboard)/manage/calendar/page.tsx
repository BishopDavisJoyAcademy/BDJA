"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  event_type: string;
  target_audience: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    apiGet<{ events: CalendarEvent[] }>("/api/calendar")
      .then((d) => { setEvents(d.events || []); setLoading(false); })
      .catch((err) => { toast.error(getErrorMessage(err)); setLoading(false); });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to create event");
      const data = await res.json();
      setEvents((prev) => [...prev, data]);
      setShowForm(false);
      toast.success("Event created");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      const res = await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success("Event deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" />{showForm ? "Cancel" : "Add Event"}</Button>
      </div>
      {showForm && (
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input name="title" placeholder="Event title" required />
            <Input name="start_date" type="datetime-local" required />
            <Input name="end_date" type="datetime-local" />
            <Input name="event_type" placeholder="Event type" defaultValue="general" />
            <Button type="submit">Create Event</Button>
          </form>
        </Card>
      )}
      <div className="space-y-3">
        {events.map((evt) => (
          <Card key={evt.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-white">{evt.title}</h3>
                <p className="text-sm text-gray-400">{new Date(evt.start_date).toLocaleString()}</p>
                <span className="text-xs text-gray-500">{evt.event_type}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(evt.id)}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
