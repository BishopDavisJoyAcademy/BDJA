"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { hasPermission } from "@/lib/permissions";
import { getDayName, formatTime } from "@/lib/utils";
import { Plus, Trash2, Edit3 } from "lucide-react";
import toast from "react-hot-toast";

export default function TimetablePage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [formData, setFormData] = useState({
    subject_id: "",
    day_of_week: "1",
    start_time: "08:00",
    end_time: "09:00",
    room: "",
    topic: "",
  });
  const [loading, setLoading] = useState(true);

  const canEdit = user ? hasPermission(user.role, "editTimetable") : false;

  useEffect(() => {
    if (!user) return;
    loadClasses();
    loadSubjects();
  }, [user]);

  useEffect(() => {
    if (selectedClass) loadTimetable();
  }, [selectedClass]);

  const loadClasses = async () => {
    const { data } = await supabase.from("classes").select("*").order("name");
    setClasses(data || []);
    if (data && data.length > 0 && !selectedClass) setSelectedClass(data[0].id);
  };

  const loadSubjects = async () => {
    const { data } = await supabase.from("subjects").select("*").order("name");
    setSubjects(data || []);
  };

  const loadTimetable = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("timetable")
      .select("*, subjects(name), profiles(full_name)")
      .eq("class_id", selectedClass)
      .order("day_of_week")
      .order("start_time");
    setEntries(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) { toast.error("You don't have permission to edit timetable"); return; }

    const payload = {
      class_id: selectedClass,
      subject_id: formData.subject_id,
      campus_id: classes.find((c) => c.id === selectedClass)?.campus_id,
      day_of_week: parseInt(formData.day_of_week),
      start_time: formData.start_time,
      end_time: formData.end_time,
      room: formData.room || null,
      topic: formData.topic || null,
      created_by: user?.id,
    };

    if (editingEntry) {
      const { error } = await supabase.from("timetable").update(payload).eq("id", editingEntry.id);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Timetable updated");
    } else {
      const { error } = await supabase.from("timetable").insert(payload);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Entry added");
    }

    setIsModalOpen(false);
    setEditingEntry(null);
    setFormData({ subject_id: "", day_of_week: "1", start_time: "08:00", end_time: "09:00", room: "", topic: "" });
    loadTimetable();
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this timetable entry?")) return;
    const { error } = await supabase.from("timetable").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Entry deleted");
    loadTimetable();
  };

  const openEdit = (entry: any) => {
    setEditingEntry(entry);
    setFormData({
      subject_id: entry.subject_id,
      day_of_week: entry.day_of_week.toString(),
      start_time: entry.start_time,
      end_time: entry.end_time,
      room: entry.room || "",
      topic: entry.topic || "",
    });
    setIsModalOpen(true);
  };

  const days = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bdja-dark">Class Timetable</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage class schedules</p>
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => { setEditingEntry(null); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Entry
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-64">
          <option value="">Select a class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !selectedClass ? (
        <Card><CardContent className="p-12 text-center text-gray-400">Select a class to view its timetable</CardContent></Card>
      ) : entries.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-400">No timetable entries for this class yet.</CardContent></Card>
      ) : (
        <div className="grid lg:grid-cols-5 gap-4">
          {days.map((day) => (
            <Card key={day} className="min-h-[300px]">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{getDayName(day)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {entries.filter((e) => e.day_of_week === day).length === 0 ? (
                  <p className="text-xs text-gray-300 text-center py-4">No classes</p>
                ) : (
                  entries
                    .filter((e) => e.day_of_week === day)
                    .map((entry) => (
                      <div key={entry.id} className="p-2.5 bg-gray-50 rounded-lg text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-bdja-primary">{entry.subjects?.name}</span>
                          {canEdit && (
                            <div className="flex gap-1">
                              <button onClick={() => openEdit(entry)} className="p-1 hover:bg-gray-200 rounded">
                                <Edit3 className="w-3 h-3 text-gray-500" />
                              </button>
                              <button onClick={() => handleDelete(entry.id)} className="p-1 hover:bg-red-100 rounded">
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-gray-500 mt-0.5">{formatTime(entry.start_time)} - {formatTime(entry.end_time)}</p>
                        {entry.room && <p className="text-gray-400">Room {entry.room}</p>}
                        {entry.topic && <p className="text-gray-400 italic">{entry.topic}</p>}
                      </div>
                    ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEntry ? "Edit Entry" : "Add Timetable Entry"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <Select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} required>
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
            <Select value={formData.day_of_week} onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}>
              {days.map((d) => (
                <option key={d} value={d}>{getDayName(d)}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <Input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <Input value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })} placeholder="e.g. Room 4A" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <Input value={formData.topic} onChange={(e) => setFormData({ ...formData, topic: e.target.value })} placeholder="Lesson topic" />
          </div>
          <Button type="submit" variant="primary" className="w-full">{editingEntry ? "Update" : "Add"} Entry</Button>
        </form>
      </Modal>
    </div>
  );
}
