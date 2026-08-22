"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { BookOpen, Plus, Trash2, Edit3, X, Save, Search, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  grade_levels: string[] | null;
  is_active: boolean;
  created_at: string;
}

const ALL_GRADES = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "", grade_levels: [] as string[], is_active: true });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ subjects: Subject[] }>("/api/admin/subjects");
      setSubjects(data.subjects || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: "", code: "", description: "", grade_levels: [], is_active: true });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Subject name is required"); return; }
    try {
      if (editingId) {
        await apiPut("/api/admin/subjects", { id: editingId, ...form });
        toast.success("Subject updated");
      } else {
        await apiPost("/api/admin/subjects", form);
        toast.success("Subject created");
      }
      resetForm();
      setShowForm(false);
      fetchSubjects();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subject? This cannot be undone.")) return;
    try {
      await apiDelete(`/api/admin/subjects?id=${id}`);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      toast.success("Subject deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleEdit = (sub: Subject) => {
    setForm({
      name: sub.name,
      code: sub.code || "",
      description: sub.description || "",
      grade_levels: sub.grade_levels || [],
      is_active: sub.is_active,
    });
    setEditingId(sub.id);
    setShowForm(true);
  };

  const toggleGrade = (grade: string) => {
    setForm((prev) => ({
      ...prev,
      grade_levels: prev.grade_levels.includes(grade)
        ? prev.grade_levels.filter((g) => g !== grade)
        : [...prev.grade_levels, grade],
    }));
  };

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.code || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.description || "").toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-white">Subject Management</h1>
          <p className="text-sm text-gray-400 mt-1">Manage academic subjects and curricula</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> Add Subject</>}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="font-semibold text-white mb-4">{editingId ? "Edit Subject" : "New Subject"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subject Name *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subject Code</label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH-101" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm resize-y" placeholder="Brief description..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-2">Grade Levels</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGrade(g)}
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        form.grade_levels.includes(g)
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-slate-800 text-gray-400 border border-gray-700 hover:border-gray-500"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <input type="checkbox" id="sub-active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-600 text-amber-400" />
                <label htmlFor="sub-active" className="text-sm text-gray-300">Active</label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit"><Save className="w-4 h-4 mr-1" />{editingId ? "Update Subject" : "Save Subject"}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search subjects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Grades</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((s) => (
                <tr key={s.id} className="text-gray-300 hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span className="font-medium">{s.name}</span>
                    </div>
                    {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{s.code || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(s.grade_levels || []).slice(0, 3).map((g) => (
                        <Badge key={g} className="bg-slate-700 text-gray-300 text-[10px] border-0">{g}</Badge>
                      ))}
                      {(s.grade_levels || []).length > 3 && (
                        <Badge className="bg-slate-700 text-gray-300 text-[10px] border-0">+{(s.grade_levels || []).length - 3}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.is_active ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-400 border-0 text-xs"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(s)}><Edit3 className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No subjects found.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
