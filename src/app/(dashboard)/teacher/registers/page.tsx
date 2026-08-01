"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";
import { Plus, Save, Trash2, X, FileText, CheckSquare, CalendarDays } from "lucide-react";

interface RegisterColumn {
  key: string;
  label: string;
  type: "checkbox" | "text" | "select";
  options?: string[];
}

interface RegisterStudent {
  id: string;
  name: string;
  admission_number: string;
}

export default function TeacherRegistersPage() {
  const { user } = useAuth();
  const [registers, setRegisters] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<RegisterStudent[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: reg }, { data: cl }] = await Promise.all([
      supabase.from("teacher_registers").select("*").eq("teacher_id", user!.id).order("register_date", { ascending: false }),
      supabase.from("classes").select("id, name, grade_level").eq("class_teacher_id", user!.id),
    ]);
    setRegisters(reg || []);
    setClasses(cl || []);
    setLoading(false);
  };

  const loadStudents = async (classId: string) => {
    const { data } = await supabase
      .from("students")
      .select("id, admission_number, profiles(full_name)")
      .eq("class_id", classId)
      .eq("status", "active")
      .order("admission_number");
    const mapped = (data || []).map((s: any) => ({
      id: s.id,
      name: s.profiles?.full_name || s.admission_number,
      admission_number: s.admission_number,
    }));
    setStudents(mapped);
    return mapped;
  };

  const createNew = () => {
    setEditing({
      title: "Attendance Register",
      class_id: "",
      register_date: new Date().toISOString().split("T")[0],
      layout_config: {
        columns: [
          { key: "present", label: "Present", type: "checkbox" },
          { key: "late", label: "Late", type: "checkbox" },
          { key: "absent", label: "Absent", type: "checkbox" },
          { key: "notes", label: "Notes", type: "text" },
        ] as RegisterColumn[],
        students: [] as RegisterStudent[],
      },
      entries: [] as Record<string, any>[],
      is_template: false,
      template_name: "",
    });
  };

  const selectClass = async (classId: string) => {
    const studs = await loadStudents(classId);
    setEditing((prev: any) => ({
      ...prev,
      class_id: classId,
      layout_config: { ...prev.layout_config, students: studs },
      entries: studs.map((s: RegisterStudent) => ({ student_id: s.id, present: false, late: false, absent: false, notes: "" })),
    }));
  };

  const addColumn = () => {
    if (!editing) return;
    const key = `col_${editing.layout_config.columns.length + 1}`;
    const cols = [...editing.layout_config.columns, { key, label: "New Column", type: "text" as const }] as RegisterColumn[];
    setEditing({ ...editing, layout_config: { ...editing.layout_config, columns: cols } });
  };

  const removeColumn = (idx: number) => {
    if (!editing) return;
    const cols = editing.layout_config.columns.filter((_: any, i: number) => i !== idx);
    setEditing({ ...editing, layout_config: { ...editing.layout_config, columns: cols } });
  };

  const updateColumn = (idx: number, field: keyof RegisterColumn, value: any) => {
    if (!editing) return;
    const cols = [...editing.layout_config.columns];
    cols[idx] = { ...cols[idx], [field]: value };
    setEditing({ ...editing, layout_config: { ...editing.layout_config, columns: cols } });
  };

  const updateEntry = (studentId: string, key: string, value: any) => {
    if (!editing) return;
    const entries = [...editing.entries];
    const existingIndex = entries.findIndex((e: any) => e.student_id === studentId);
    if (existingIndex >= 0) {
      entries[existingIndex] = { ...entries[existingIndex], [key]: value };
    } else {
      entries.push({ student_id: studentId, [key]: value });
    }
    setEditing({ ...editing, entries });
  };

  const getEntry = (studentId: string) => {
    if (!editing) return {};
    return editing.entries.find((e: any) => e.student_id === studentId) || {};
  };

  const saveRegister = async () => {
    if (!editing.title || !editing.class_id) { toast.error("Title and class are required"); return; }
    const payload = {
      teacher_id: user!.id,
      class_id: editing.class_id,
      title: editing.title,
      register_date: editing.register_date,
      layout_config: editing.layout_config,
      entries: editing.entries,
      is_template: editing.is_template,
      template_name: editing.is_template ? editing.template_name : null,
    };
    const { error } = editing.id
      ? await supabase.from("teacher_registers").update(payload).eq("id", editing.id)
      : await supabase.from("teacher_registers").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Register saved"); setEditing(null); loadData(); }
  };

  const deleteRegister = async (id: string) => {
    if (!confirm("Delete this register?")) return;
    await supabase.from("teacher_registers").delete().eq("id", id);
    loadData();
  };

  const useAsTemplate = (reg: any) => {
    setEditing({
      ...reg,
      id: undefined,
      title: reg.title + " (Copy)",
      register_date: new Date().toISOString().split("T")[0],
      entries: reg.layout_config.students.map((s: any) => ({ student_id: s.id, present: false, late: false, absent: false, notes: "" })),
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-bdja-primary to-bdja-accent rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Student Registers</h1>
        <p className="text-white/80 mt-1">Take attendance with flexible, customizable registers</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={createNew}><Plus className="w-4 h-4 mr-1" /> New Register</Button>
      </div>

      {editing && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{editing.id ? "Edit Register" : "New Register"}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-4 gap-3">
              <Input placeholder="Title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <Input type="date" value={editing.register_date} onChange={(e) => setEditing({ ...editing, register_date: e.target.value })} />
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary"
                value={editing.class_id}
                onChange={(e) => selectClass(e.target.value)}
              >
                <option value="">Select Class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_template" checked={editing.is_template} onChange={(e) => setEditing({ ...editing, is_template: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="is_template" className="text-sm text-gray-600">Save as Template</label>
              </div>
            </div>
            {editing.is_template && (
              <Input placeholder="Template Name" value={editing.template_name || ""} onChange={(e) => setEditing({ ...editing, template_name: e.target.value })} />
            )}

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={addColumn}><Plus className="w-3.5 h-3.5 mr-1" /> Add Column</Button>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2 text-left font-semibold text-xs uppercase text-gray-500 min-w-[180px]">Student</th>
                    {editing.layout_config.columns.map((col: RegisterColumn, ci: number) => (
                      <th key={ci} className="border p-2 min-w-[100px]">
                        <div className="space-y-1">
                          <Input className="text-xs h-7 border-0 bg-transparent p-0 text-center font-semibold" value={col.label} onChange={(e) => updateColumn(ci, "label", e.target.value)} />
                          <select className="text-xs border-0 bg-transparent w-full text-center" value={col.type} onChange={(e) => updateColumn(ci, "type", e.target.value)}>
                            <option value="checkbox">Checkbox</option>
                            <option value="text">Text</option>
                            <option value="select">Select</option>
                          </select>
                          <button onClick={() => removeColumn(ci)} className="text-gray-400 hover:text-red-500 text-xs"><X className="w-3 h-3 mx-auto" /></button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editing.layout_config.students.map((s: RegisterStudent) => {
                    const entry = getEntry(s.id);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50">
                        <td className="border p-2">
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.admission_number}</p>
                        </td>
                        {editing.layout_config.columns.map((col: RegisterColumn) => (
                          <td key={col.key} className="border p-2 text-center">
                            {col.type === "checkbox" ? (
                              <input
                                type="checkbox"
                                checked={!!entry[col.key]}
                                onChange={(e) => updateEntry(s.id, col.key, e.target.checked)}
                                className="w-5 h-5 accent-bdja-primary"
                              />
                            ) : col.type === "select" ? (
                              <select
                                className="text-xs border rounded px-2 py-1"
                                value={entry[col.key] || ""}
                                onChange={(e) => updateEntry(s.id, col.key, e.target.value)}
                              >
                                <option value="">-</option>
                                {(col.options || ["Present", "Absent", "Late", "Excused"]).map((o: string) => (
                                  <option key={o} value={o.toLowerCase()}>{o}</option>
                                ))}
                              </select>
                            ) : (
                              <Input className="text-xs h-7 px-1" value={entry[col.key] || ""} onChange={(e) => updateEntry(s.id, col.key, e.target.value)} />
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveRegister}><Save className="w-4 h-4 mr-1" /> Save Register</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {registers.map((reg) => (
          <Card key={reg.id} className="card-hover">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-bdja-primary" />
                  <div>
                    <h3 className="font-semibold text-bdja-dark text-sm">{reg.title}</h3>
                    <p className="text-xs text-gray-500">{reg.register_date}</p>
                  </div>
                </div>
                {reg.is_template && <Badge variant="default" className="text-xs">Template</Badge>}
              </div>
              <p className="text-xs text-gray-500 mb-3">{reg.layout_config.students?.length || 0} students &middot; {reg.layout_config.columns?.length || 0} columns</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(reg)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => useAsTemplate(reg)}>Use as Template</Button>
                <Button size="sm" variant="danger" onClick={() => deleteRegister(reg.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
