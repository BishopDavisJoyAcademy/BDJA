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
import { Plus, Save, Trash2, X, BarChart3, Calculator, Copy } from "lucide-react";

interface MarkColumn {
  key: string;
  label: string;
  maxScore: number;
}

interface MarkStudent {
  id: string;
  name: string;
  admission_number: string;
}

export default function TeacherMarksPage() {
  const { user } = useAuth();
  const [sheets, setSheets] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [students, setStudents] = useState<MarkStudent[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: sh }, { data: cl }, { data: su }, { data: tp }] = await Promise.all([
      supabase.from("teacher_mark_sheets").select("*").eq("teacher_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name, grade_level").eq("class_teacher_id", user!.id),
      supabase.from("subjects").select("id, name"),
      supabase.from("mark_sheet_templates").select("*").eq("is_active", true),
    ]);
    setSheets(sh || []);
    setClasses(cl || []);
    setSubjects(su || []);
    setTemplates(tp || []);
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
      title: "",
      class_id: "",
      subject_id: "",
      term: "Term 1",
      academic_year: new Date().getFullYear().toString(),
      layout_config: { columns: [{ key: "score", label: "Score", maxScore: 100 }] as MarkColumn[], students: [] as MarkStudent[] },
      entries: [] as Record<string, any>[],
      max_score: 100,
      is_template: false,
      template_name: "",
    });
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template || !editing) return;
    setEditing({
      ...editing,
      layout_config: { ...editing.layout_config, columns: template.layout_config.columns },
      max_score: template.layout_config.columns.reduce((sum: number, c: MarkColumn) => sum + (c.maxScore || 0), 0) || 100,
    });
  };

  const selectClass = async (classId: string) => {
    const studs = await loadStudents(classId);
    setEditing((prev: any) => ({
      ...prev,
      class_id: classId,
      layout_config: { ...prev.layout_config, students: studs },
      entries: studs.map((s: MarkStudent) => ({ student_id: s.id, score: "" })),
    }));
  };

  const addColumn = () => {
    if (!editing) return;
    const key = `col_${editing.layout_config.columns.length + 1}`;
    const cols = [...editing.layout_config.columns, { key, label: "New Column", maxScore: 100 } as MarkColumn];
    setEditing({ ...editing, layout_config: { ...editing.layout_config, columns: cols } });
  };

  const removeColumn = (idx: number) => {
    if (!editing) return;
    const cols = editing.layout_config.columns.filter((_: any, i: number) => i !== idx);
    setEditing({ ...editing, layout_config: { ...editing.layout_config, columns: cols } });
  };

  const updateColumn = (idx: number, field: keyof MarkColumn, value: any) => {
    if (!editing) return;
    const cols = [...editing.layout_config.columns];
    cols[idx] = { ...cols[idx], [field]: field === "maxScore" ? parseInt(value) || 0 : value };
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

  const calculateTotal = (studentId: string) => {
    const entry = getEntry(studentId);
    return editing.layout_config.columns.reduce((sum: number, col: MarkColumn) => {
      const val = parseFloat(entry[col.key]) || 0;
      return sum + val;
    }, 0);
  };

  const calculatePercentage = (studentId: string) => {
    const total = calculateTotal(studentId);
    const max = editing.layout_config.columns.reduce((sum: number, col: MarkColumn) => sum + (col.maxScore || 0), 0);
    return max > 0 ? ((total / max) * 100).toFixed(1) : "0";
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    return "E";
  };

  const saveSheet = async () => {
    if (!editing.title || !editing.class_id) { toast.error("Title and class are required"); return; }
    const payload = {
      teacher_id: user!.id,
      class_id: editing.class_id,
      subject_id: editing.subject_id || null,
      title: editing.title,
      term: editing.term,
      academic_year: editing.academic_year,
      layout_config: editing.layout_config,
      entries: editing.entries,
      max_score: editing.max_score,
      is_template: editing.is_template,
      template_name: editing.is_template ? editing.template_name : null,
    };
    const { error } = editing.id
      ? await supabase.from("teacher_mark_sheets").update(payload).eq("id", editing.id)
      : await supabase.from("teacher_mark_sheets").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Mark sheet saved"); setEditing(null); loadData(); }
  };

  const deleteSheet = async (id: string) => {
    if (!confirm("Delete this mark sheet?")) return;
    await supabase.from("teacher_mark_sheets").delete().eq("id", id);
    loadData();
  };

  const useAsTemplate = (sheet: any) => {
    setEditing({
      ...sheet,
      id: undefined,
      title: sheet.title + " (Copy)",
      entries: sheet.layout_config.students.map((s: any) => {
        const obj: Record<string, any> = { student_id: s.id };
        sheet.layout_config.columns.forEach((c: MarkColumn) => { obj[c.key] = ""; });
        return obj;
      }),
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-bdja-primary to-bdja-accent rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Mark Sheets</h1>
        <p className="text-white/80 mt-1">Create and manage student mark sheets with flexible layouts</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={createNew}><Plus className="w-4 h-4 mr-1" /> New Mark Sheet</Button>
      </div>

      {editing && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{editing.id ? "Edit Mark Sheet" : "New Mark Sheet"}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-4 gap-3">
              <Input placeholder="Title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={editing.class_id} onChange={(e) => selectClass(e.target.value)}>
                <option value="">Select Class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={editing.subject_id || ""} onChange={(e) => setEditing({ ...editing, subject_id: e.target.value })}>
                <option value="">Select Subject (optional)</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value={editing.term} onChange={(e) => setEditing({ ...editing, term: e.target.value })}>
                <option>Term 1</option><option>Term 2</option><option>Term 3</option>
              </select>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <Input placeholder="Academic Year" value={editing.academic_year} onChange={(e) => setEditing({ ...editing, academic_year: e.target.value })} />
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" onChange={(e) => e.target.value && applyTemplate(e.target.value)}>
                <option value="">Apply Template (optional)</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ms_template" checked={editing.is_template} onChange={(e) => setEditing({ ...editing, is_template: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="ms_template" className="text-sm text-gray-600">Save as Template</label>
              </div>
            </div>
            {editing.is_template && <Input placeholder="Template Name" value={editing.template_name || ""} onChange={(e) => setEditing({ ...editing, template_name: e.target.value })} />}

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={addColumn}><Plus className="w-3.5 h-3.5 mr-1" /> Add Assessment Column</Button>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2 text-left font-semibold text-xs uppercase text-gray-500 min-w-[180px]">Student</th>
                    {editing.layout_config.columns.map((col: MarkColumn, ci: number) => (
                      <th key={ci} className="border p-2 min-w-[100px]">
                        <div className="space-y-1">
                          <Input className="text-xs h-7 border-0 bg-transparent p-0 text-center font-semibold" value={col.label} onChange={(e) => updateColumn(ci, "label", e.target.value)} />
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs text-gray-400">Max:</span>
                            <Input type="number" className="text-xs h-6 w-16 border-0 bg-transparent p-0 text-center" value={col.maxScore} onChange={(e) => updateColumn(ci, "maxScore", e.target.value)} />
                          </div>
                          <button onClick={() => removeColumn(ci)} className="text-gray-400 hover:text-red-500 text-xs"><X className="w-3 h-3 mx-auto" /></button>
                        </div>
                      </th>
                    ))}
                    <th className="border p-2 text-center font-semibold text-xs uppercase text-gray-500">Total</th>
                    <th className="border p-2 text-center font-semibold text-xs uppercase text-gray-500">%</th>
                    <th className="border p-2 text-center font-semibold text-xs uppercase text-gray-500">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {editing.layout_config.students.map((s: MarkStudent) => {
                    const entry = getEntry(s.id);
                    const total = calculateTotal(s.id);
                    const pct = parseFloat(calculatePercentage(s.id));
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50">
                        <td className="border p-2">
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.admission_number}</p>
                        </td>
                        {editing.layout_config.columns.map((col: MarkColumn) => (
                          <td key={col.key} className="border p-2">
                            <Input type="number" min={0} max={col.maxScore} className="text-xs h-8 text-center" value={entry[col.key] || ""} onChange={(e) => updateEntry(s.id, col.key, e.target.value)} />
                          </td>
                        ))}
                        <td className="border p-2 text-center font-semibold text-sm">{total}</td>
                        <td className="border p-2 text-center text-sm">{calculatePercentage(s.id)}%</td>
                        <td className="border p-2 text-center">
                          <Badge className={`text-xs ${pct >= 60 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                            {getGrade(pct)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveSheet}><Save className="w-4 h-4 mr-1" /> Save Mark Sheet</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sheets.map((sheet) => (
          <Card key={sheet.id} className="card-hover">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-bdja-primary" />
                  <div>
                    <h3 className="font-semibold text-bdja-dark text-sm">{sheet.title}</h3>
                    <p className="text-xs text-gray-500">{sheet.term} &middot; {sheet.academic_year}</p>
                  </div>
                </div>
                {sheet.is_template && <Badge variant="default" className="text-xs">Template</Badge>}
              </div>
              <p className="text-xs text-gray-500 mb-3">{sheet.layout_config.students?.length || 0} students &middot; {sheet.layout_config.columns?.length || 0} assessments</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(sheet)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => useAsTemplate(sheet)}>Use as Template</Button>
                <Button size="sm" variant="danger" onClick={() => deleteSheet(sheet.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
