"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Eye, AlertCircle, CheckCircle, X, Loader2, Sparkles, Monitor, Save, ArrowLeft } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";
import { apiGet, apiPost, apiPut, apiFetch } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

interface CmsPage {
  id: string; slug: string; title: string; content: string;
  meta_description?: string | null; is_published: boolean | null;
  updated_at?: string | null;
}

export default function CmsPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState({ slug: "", title: "", content: "", meta_description: "", is_published: false });
  const [saving, setSaving] = useState(false);
  const [joyLoading, setJoyLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    apiGet("/api/admin/pages").then((d) => { setPages(d.pages || []); setLoading(false); }).catch((err) => { setError(getErrorMessage(err)); setLoading(false); });
  }, []);

  const resetForm = () => {
    setForm({ slug: "", title: "", content: "", meta_description: "", is_published: false });
    setEditing(null); setPreviewMode(false); setShowEditor(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.slug || !form.title || !form.content) { toast.error("Slug, title, and content are required"); return; }
    setSaving(true); setError("");
    try {
      if (editing) {
        await apiPut(`/api/admin/pages?id=${editing.id}`, { id: editing.id, ...form });
        toast.success("Page updated!");
      } else {
        await apiPost("/api/admin/pages", form);
        toast.success("Page created!");
      }
      resetForm();
      const d = await apiGet("/api/admin/pages");
      setPages(d.pages || []);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    try { await apiFetch(`/api/admin/pages?id=${id}`, { method: "DELETE" }); toast.success("Page deleted"); setPages((prev) => prev.filter((p) => p.id !== id)); } catch (err: unknown) { toast.error(getErrorMessage(err)); }
  };

  const askJoy = async () => {
    if (!form.content.trim()) { toast.error("Enter some content first"); return; }
    setJoyLoading(true);
    try {
      const res = await apiPost("/api/chat", {
        messages: [{ role: "user", content: `Transform the following plain text into properly structured, professional HTML with modern styling (using inline styles or Tailwind classes). Use headings, paragraphs, lists, and emphasis where appropriate. Make it look polished and professional for a school website. Here is the text:

${form.content}` }],
      });
      const html = (res as { message?: string; success?: boolean }).message || "";
      // Extract HTML from markdown code blocks if present
      const match = html.match(/```html
?([\s\S]*?)```/);
      const cleanHtml = match ? match[1].trim() : html;
      setForm((prev) => ({ ...prev, content: cleanHtml }));
      toast.success("Joy transformed your content!");
    } catch (err: unknown) { toast.error("Joy failed: " + getErrorMessage(err)); } finally { setJoyLoading(false); }
  };

  const startEdit = (page: CmsPage) => {
    setEditing(page);
    setForm({ slug: page.slug, title: page.title, content: page.content, meta_description: page.meta_description || "", is_published: page.is_published ?? false });
    setShowEditor(true); setPreviewMode(false);
  };

  const startCreate = () => { resetForm(); setShowEditor(true); };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div></div>;
  if (error && !showEditor) return <div className="p-4 bg-red-500/10 text-red-400 rounded-xl flex items-center gap-2 border border-red-500/20"><AlertCircle className="w-5 h-5" />{error}</div>;

  if (showEditor) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <button onClick={resetForm} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"><ArrowLeft className="w-4 h-4" /> Back to Pages</button>
        <div><h1 className="text-3xl font-bold text-white">{editing ? "Edit Page" : "Create Page"}</h1><p className="text-gray-400 mt-1">{editing ? `Editing: ${editing.slug}` : "Create a new CMS page"}</p></div>
        <div className="flex gap-2">
          <button onClick={() => setPreviewMode(false)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!previewMode ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800/50 text-gray-400 border border-slate-700"}`}><Edit className="w-4 h-4 inline mr-1" /> Editor</button>
          <button onClick={() => setPreviewMode(true)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${previewMode ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800/50 text-gray-400 border border-slate-700"}`}><Monitor className="w-4 h-4 inline mr-1" /> Preview</button>
        </div>
        {!previewMode ? (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Slug *</label><input required value={form.slug} onChange={(e) => setForm({...form, slug: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="about-us" /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Title *</label><input required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="About Us" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Meta Description</label><input value={form.meta_description} onChange={(e) => setForm({...form, meta_description: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="Brief description for SEO..." /></div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-300">Content *</label>
                  <button type="button" onClick={askJoy} disabled={joyLoading} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-all">
                    <Sparkles className="w-3 h-3" /> {joyLoading ? "Thinking..." : "Ask Joy to Transform"}
                  </button>
                </div>
                <textarea required value={form.content} onChange={(e) => setForm({...form, content: e.target.value})} rows={12} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 font-mono text-sm" placeholder="Enter plain text or HTML content..." />
                <p className="text-xs text-gray-500 mt-1">Enter plain text, HTML, or ask Joy to transform it into polished HTML.</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({...form, is_published: e.target.checked})} className="w-4 h-4 rounded border-slate-600 text-amber-500 bg-slate-900 focus:ring-amber-500/20" />
                <span className="text-sm text-gray-300">Publish this page (make it visible to the public)</span>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={resetForm} className="px-6 py-2.5 rounded-xl border border-slate-600 text-gray-300 hover:bg-slate-700/50 transition-all text-sm font-medium">Cancel</button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? "Saving..." : (editing ? "Update Page" : "Create Page")}</button>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-2xl p-8 min-h-[400px]">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{form.title || "Preview"}</h1>
            <div className="prose prose-lg max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: form.content || "<p class='text-gray-400'>No content to preview.</p>" }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-white">CMS Pages</h1><p className="text-gray-400 mt-1">{pages.length} pages</p></div>
        <button onClick={startCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20 font-medium"><Plus className="w-4 h-4" /> New Page</button>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 border-b border-slate-700/50"><tr>
            <th className="text-left px-5 py-4 font-medium text-gray-400">Slug</th>
            <th className="text-left px-5 py-4 font-medium text-gray-400">Title</th>
            <th className="text-left px-5 py-4 font-medium text-gray-400">Status</th>
            <th className="text-left px-5 py-4 font-medium text-gray-400">Updated</th>
            <th className="text-left px-5 py-4 font-medium text-gray-400">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-700/30">
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-slate-700/20 transition-colors">
                <td className="px-5 py-4 font-mono text-amber-400 text-xs">/{page.slug}</td>
                <td className="px-5 py-4 text-white font-medium">{page.title}</td>
                <td className="px-5 py-4">{page.is_published ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Published</span> : <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">Draft</span>}</td>
                <td className="px-5 py-4 text-gray-400">{page.updated_at ? new Date(page.updated_at).toLocaleDateString() : "—"}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(page)} className="p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/60 text-gray-300 hover:text-white transition-all"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(page.id)} className="p-2 rounded-lg bg-slate-700/30 hover:bg-red-500/20 text-gray-300 hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages.length === 0 && <div className="text-center py-12 text-gray-500"><p>No CMS pages yet. Create your first page.</p></div>}
      </div>
    </div>
  );
}
