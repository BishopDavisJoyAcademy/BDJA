"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { BookOpen, Plus, Trash2, Search, Loader2 } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  grade_levels: string[] | null;
  is_active: boolean;
}

export default function SubjectsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "", grade_levels: "" });

  useEffect(() => {
    if (!loading && user?.role !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "admin") fetchSubjects();
  }, [user]);

  async function fetchSubjects() {
    try {
      setFetching(true);
      const res = await fetch("/api/admin/subjects");
      const data = await res.json();
      setSubjects(data.subjects || []);
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
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          grade_levels: form.grade_levels ? form.grade_levels.split(",").map((s) => s.trim()) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setShowForm(false);
      setForm({ name: "", code: "", description: "", grade_levels: "" });
      fetchSubjects();
    } catch (err) {
      alert("Failed to add subject");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this subject?")) return;
    try {
      const res = await fetch(`/api/admin/subjects?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchSubjects();
    } catch (err) {
      alert("Failed to delete");
    }
  }

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.code || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-bdja-primary animate-spin" />
      </div>
    );
  }

  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subject Management</h1>
          <p className="text-gray-500">Manage academic subjects and curricula</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Subject</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Subject Name *" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Subject Code" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="text" value={form.grade_levels} onChange={(e) => setForm({ ...form, grade_levels: e.target.value })} placeholder="Grade Levels (comma separated)" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3} className="md:col-span-2 w-full px-3 py-2 border border-gray-300 rounded-lg resize-none" />
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving..." : "Save Subject"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subjects..." className="flex-1 outline-none text-sm" />
        </div>
        {fetching ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No subjects found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <div key={s.id} className="flex items-start justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{s.name}</h4>
                    <p className="text-xs text-gray-500">{s.code || "No code"} · {s.grade_levels?.join(", ") || "All grades"}</p>
                    {s.description && <p className="text-xs text-gray-400 mt-1">{s.description}</p>}
                  </div>
                </div>
                <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
