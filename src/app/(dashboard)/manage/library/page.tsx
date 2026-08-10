"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Library, Plus, Trash2, BookOpen, Search, Loader2 } from "lucide-react";

interface LibraryResource {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  resource_type: string;
  available_copies: number | null;
  total_copies: number | null;
  cover_url: string | null;
  file_url: string | null;
  grade_levels: string[] | null;
  subject_id: string | null;
  campus_id: string | null;
  created_at: string | null;
}

export default function LibraryManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    resource_type: "book",
    total_copies: "1",
    cover_url: "",
    file_url: "",
    grade_levels: "",
  });

  useEffect(() => {
    if (!loading && user?.user_category !== "staff" && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.user_category === "staff" || user?.user_category === "admin") {
      fetchResources();
    }
  }, [user]);

  async function fetchResources() {
    try {
      setFetching(true);
      const res = await fetch("/api/library");
      const data = await res.json();
      setResources(data.resources || []);
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
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          total_copies: parseInt(form.total_copies) || 1,
          available_copies: parseInt(form.total_copies) || 1,
          grade_levels: form.grade_levels ? form.grade_levels.split(",").map((s) => s.trim()) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setShowForm(false);
      setForm({ title: "", author: "", isbn: "", resource_type: "book", total_copies: "1", cover_url: "", file_url: "", grade_levels: "" });
      fetchResources();
    } catch (err) {
      alert("Failed to add resource");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this resource?")) return;
    try {
      const res = await fetch(`/api/library?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchResources();
    } catch (err) {
      alert("Failed to delete");
    }
  }

  const filtered = resources.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.author || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-bdja-primary animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "staff" && user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Library Management</h1>
          <p className="text-gray-500">Manage library books and resources</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Resource
        </button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Resource</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title *" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="text" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} placeholder="ISBN" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="book">Book</option>
              <option value="ebook">E-Book</option>
              <option value="video">Video</option>
              <option value="worksheet">Worksheet</option>
            </select>
            <input type="number" value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: e.target.value })} placeholder="Total Copies" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="text" value={form.grade_levels} onChange={(e) => setForm({ ...form, grade_levels: e.target.value })} placeholder="Grade Levels (comma separated)" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="url" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="Cover Image URL" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="url" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="File URL" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving..." : "Save Resource"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources..." className="flex-1 outline-none text-sm" />
        </div>
        {fetching ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No resources found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <div key={r.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {r.cover_url ? (
                      <img src={r.cover_url} alt={r.title} className="w-12 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-16 bg-gray-100 rounded flex items-center justify-center"><BookOpen className="w-5 h-5 text-gray-400" /></div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{r.title}</h4>
                      <p className="text-xs text-gray-500">{r.author || "No author"} · {r.resource_type}</p>
                      <p className="text-xs text-gray-400 mt-1">{r.available_copies ?? 0} / {r.total_copies ?? 0} available</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
