"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import { Plus, Save, Trash2, X, Grid3X3 } from "lucide-react";

interface TimetableSlot {
  rowIndex: number;
  colIndex: number;
  subject: string;
  room: string;
  notes: string;
}

interface TimetableData {
  rows: string[];
  columns: string[];
  slots: TimetableSlot[];
}

export default function TeacherTimetablesPage() {
  const { user } = useAuth();
  const [timetables, setTimetables] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const [{ data: tt }, { data: cl }] = await Promise.all([
      supabase.from("teacher_timetables").select("*").eq("teacher_id", user!.id).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name").eq("class_teacher_id", user!.id),
    ]);
    setTimetables(tt || []);
    setClasses(cl || []);
  };

  const createNew = () => {
    setEditing({
      title: "New Timetable",
      description: "",
      class_id: "",
      layout_config: {
        rows: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        columns: ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM"],
        slots: [],
      } as TimetableData,
      is_template: false,
      is_active: true,
    });
  };

  const addRow = () => {
    if (!editing) return;
    const config = { ...editing.layout_config, rows: [...editing.layout_config.rows, `Row ${editing.layout_config.rows.length + 1}`] };
    setEditing({ ...editing, layout_config: config });
  };

  const removeRow = (idx: number) => {
    if (!editing) return;
    const rows = editing.layout_config.rows.filter((_: any, i: number) => i !== idx);
    const slots = editing.layout_config.slots.filter((s: TimetableSlot) => s.rowIndex !== idx);
    setEditing({ ...editing, layout_config: { ...editing.layout_config, rows, slots } });
  };

  const addColumn = () => {
    if (!editing) return;
    const config = { ...editing.layout_config, columns: [...editing.layout_config.columns, `Col ${editing.layout_config.columns.length + 1}`] };
    setEditing({ ...editing, layout_config: config });
  };

  const removeColumn = (idx: number) => {
    if (!editing) return;
    const cols = editing.layout_config.columns.filter((_: any, i: number) => i !== idx);
    const slots = editing.layout_config.slots.filter((s: TimetableSlot) => s.colIndex !== idx);
    setEditing({ ...editing, layout_config: { ...editing.layout_config, columns: cols, slots } });
  };

  const updateSlot = (row: number, col: number, field: keyof TimetableSlot, value: string) => {
    if (!editing) return;
    const slots = [...editing.layout_config.slots];
    const existing = slots.find((s: TimetableSlot) => s.rowIndex === row && s.colIndex === col);
    if (existing) {
      existing[field] = value;
    } else {
      slots.push({ rowIndex: row, colIndex: col, subject: field === "subject" ? value : "", room: field === "room" ? value : "", notes: field === "notes" ? value : "" });
    }
    setEditing({ ...editing, layout_config: { ...editing.layout_config, slots } });
  };

  const getSlot = (row: number, col: number) => {
    if (!editing) return null;
    return editing.layout_config.slots.find((s: TimetableSlot) => s.rowIndex === row && s.colIndex === col);
  };

  const saveTimetable = async () => {
    if (!editing.title) { toast.error("Title is required"); return; }
    const payload = {
      teacher_id: user!.id,
      class_id: editing.class_id || null,
      title: editing.title,
      description: editing.description,
      layout_config: editing.layout_config,
      is_template: editing.is_template,
      is_active: true,
    };
    const { error } = editing.id
      ? await supabase.from("teacher_timetables").update(payload).eq("id", editing.id)
      : await supabase.from("teacher_timetables").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Timetable saved"); setEditing(null); loadData(); }
  };

  const deleteTimetable = async (id: string) => {
    if (!confirm("Delete this timetable?")) return;
    await supabase.from("teacher_timetables").delete().eq("id", id);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-bdja-primary to-bdja-accent rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">My Timetables</h1>
        <p className="text-white/80 mt-1">Create flexible timetables with custom rows and columns</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={createNew}><Plus className="w-4 h-4 mr-1" /> Create Timetable</Button>
      </div>

      {editing && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{editing.id ? "Edit Timetable" : "New Timetable"}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <Input placeholder="Title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <Input placeholder="Description" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={editing.class_id || ""} onChange={(e) => setEditing({ ...editing, class_id: e.target.value })}>
                <option value="">Select Class (optional)</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={addRow}><Plus className="w-3.5 h-3.5 mr-1" /> Add Row</Button>
              <Button size="sm" variant="outline" onClick={addColumn}><Plus className="w-3.5 h-3.5 mr-1" /> Add Column</Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border p-2 bg-gray-50 min-w-[100px]"></th>
                    {editing.layout_config.columns.map((col: string, ci: number) => (
                      <th key={ci} className="border p-2 bg-gray-50 min-w-[140px]">
                        <div className="flex items-center gap-1">
                          <Input className="text-xs h-7 border-0 bg-transparent p-0 text-center font-semibold" value={col} onChange={(e) => {
                            const cols = [...editing.layout_config.columns];
                            cols[ci] = e.target.value;
                            setEditing({ ...editing, layout_config: { ...editing.layout_config, columns: cols } });
                          }} />
                          <button onClick={() => removeColumn(ci)} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editing.layout_config.rows.map((row: string, ri: number) => (
                    <tr key={ri}>
                      <td className="border p-2 bg-gray-50">
                        <div className="flex items-center gap-1">
                          <Input className="text-xs h-7 border-0 bg-transparent p-0 font-medium" value={row} onChange={(e) => {
                            const rows = [...editing.layout_config.rows];
                            rows[ri] = e.target.value;
                            setEditing({ ...editing, layout_config: { ...editing.layout_config, rows } });
                          }} />
                          <button onClick={() => removeRow(ri)} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                      {editing.layout_config.columns.map((_: string, ci: number) => {
                        const slot = getSlot(ri, ci);
                        return (
                          <td key={ci} className="border p-1">
                            <div className="space-y-1">
                              <Input className="text-xs h-6 px-1 py-0" placeholder="Subject" value={slot?.subject || ""} onChange={(e) => updateSlot(ri, ci, "subject", e.target.value)} />
                              <Input className="text-xs h-6 px-1 py-0" placeholder="Room" value={slot?.room || ""} onChange={(e) => updateSlot(ri, ci, "room", e.target.value)} />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveTimetable}><Save className="w-4 h-4 mr-1" /> Save Timetable</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {timetables.map((tt) => (
          <Card key={tt.id} className="card-hover cursor-pointer" onClick={() => setEditing(tt)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-bdja-dark">{tt.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{tt.layout_config.rows?.length || 0} rows &times; {tt.layout_config.columns?.length || 0} columns</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteTimetable(tt.id); }}><Trash2 className="w-4 h-4 text-gray-400" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
