"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Eye, AlertCircle, CheckCircle } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  is_published: boolean | null;
  updated_at: string;
}

export default function CmsPagesPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [form, setForm] = useState({ slug: "", title: "", content: "", meta_description: "", is_published: false });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchPages();
  }, []);

  async function fetchPages() {
    try {
      const res = await fetch("/api/admin/pages");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPages(data.pages || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const url = editing ? `/api/admin/pages?id=${editing.id}` : "/api/admin/pages";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSuccess(editing ? "Page updated!" : "Page created!");
      setEditing(null);
      setForm({ slug: "", title: "", content: "", meta_description: "", is_published: false });
      fetchPages();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (page: CmsPage) => {
    setEditing(page);
    setForm({ slug: page.slug, title: page.title, content: "", meta_description: "", is_published: page.is_published });
    fetch(`/api/admin/pages?slug=${page.slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.page) {
          setForm({
            slug: data.page.slug,
            title: data.page.title,
            content: data.page.content || "",
            meta_description: data.page.meta_description || "",
            is_published: data.page.is_published,
          });
        }
      });
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">CMS Pages</h1>
        <button onClick={() => { setEditing(null); setForm({ slug: "", title: "", content: "", meta_description: "", is_published: false }); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> New Page
        </button>
      </div>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{page.title}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">/{page.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${page.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {page.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(page)} className="text-blue-600 hover:text-blue-700"><Edit className="w-4 h-4" /></button>
                      <a href={`/${page.slug}`} target="_blank" className="text-gray-500 hover:text-gray-700"><Eye className="w-4 h-4" /></a>
                    </div>
                  </td>
                </tr>
              ))}
              {pages.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No pages yet</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{editing ? "Edit Page" : "New Page"}</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input type="text" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="about-us" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
              <input type="text" value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={10} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_published" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded" />
              <label htmlFor="is_published" className="text-sm font-medium text-gray-700">Published</label>
            </div>
            <button type="submit" disabled={saving}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
              {saving ? "Saving..." : (editing ? "Update Page" : "Create Page")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
