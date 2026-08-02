"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import {
  FileText, Plus, Trash2, Edit3, Eye, EyeOff, Save, X, Loader2,
  Globe, Clock, User
} from "lucide-react";
import toast from "react-hot-toast";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description?: string;
  meta_keywords?: string;
  is_published: boolean;
  updated_at: string;
  last_edited_by?: string;
  profiles?: { full_name: string } | null;
}

export default function AdminPagesPage() {
  const { user } = useAuth();
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);
  const [deletingPage, setDeletingPage] = useState<CmsPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slug: "",
    title: "",
    content: "",
    meta_description: "",
    meta_keywords: "",
    is_published: true,
  });

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pages");
      const data = await res.json();
      setPages(data.pages || []);
    } catch (err) {
      toast.error("Failed to load pages");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingPage(null);
    setForm({ slug: "", title: "", content: "", meta_description: "", meta_keywords: "", is_published: true });
    setIsModalOpen(true);
  };

  const openEdit = (page: CmsPage) => {
    setEditingPage(page);
    setForm({
      slug: page.slug,
      title: page.title,
      content: page.content,
      meta_description: page.meta_description || "",
      meta_keywords: page.meta_keywords || "",
      is_published: page.is_published,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.slug.trim() || !form.title.trim()) {
      toast.error("Slug and title are required");
      return;
    }
    setSaving(true);
    try {
      const payload = editingPage
        ? { id: editingPage.id, ...form }
        : { ...form };
      const res = await fetch("/api/admin/pages", {
        method: editingPage ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
      } else {
        toast.success(editingPage ? "Page updated" : "Page created");
        setIsModalOpen(false);
        loadPages();
      }
    } catch (err) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPage) return;
    try {
      const res = await fetch(`/api/admin/pages?id=${deletingPage.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete");
      } else {
        toast.success("Page deleted");
        setIsDeleteModalOpen(false);
        setDeletingPage(null);
        loadPages();
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return dateStr; }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bdja-dark">Pages</h1>
          <p className="text-gray-500 text-sm mt-1">Manage public website content without touching code</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> New Page
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-10 h-10 text-bdja-primary animate-spin" />
        </div>
      ) : pages.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-400">No pages yet. Create your first page.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {pages.map((page) => (
            <Card key={page.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-bdja-primary flex-shrink-0" />
                      <h3 className="font-semibold text-bdja-dark text-sm truncate">{page.title}</h3>
                      {page.is_published ? (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Live
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Draft
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" /> /{page.slug}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(page.updated_at)}
                      </span>
                      {page.profiles?.full_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {page.profiles.full_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(page)}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => { setDeletingPage(page); setIsDeleteModalOpen(true); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPage ? `Edit: ${editingPage.title}` : "New Page"}>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Slug (URL)</label>
              <Input
                placeholder="about"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                disabled={!!editingPage}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Title</label>
              <Input
                placeholder="About Us"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Meta Description</label>
            <Input
              placeholder="Brief description for SEO"
              value={form.meta_description}
              onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Meta Keywords</label>
            <Input
              placeholder="school, education, nanyuki"
              value={form.meta_keywords}
              onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-bdja-primary focus:ring-bdja-primary"
            />
            <label htmlFor="published" className="text-sm text-gray-600">Published (visible to public)</label>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Content</label>
            <RichTextEditor
              value={form.content}
              onChange={(html) => setForm({ ...form, content: html })}
              placeholder="Write your page content here..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              {saving ? "Saving..." : (editingPage ? "Update Page" : "Create Page")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Page">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{deletingPage?.title}</strong>? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
