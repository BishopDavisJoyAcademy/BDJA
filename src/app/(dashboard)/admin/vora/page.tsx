"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Video, Plus, Trash2, Edit3, ExternalLink, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

interface VoraVideo {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  subject: string;
  grade_level: string;
  topic?: string;
  duration?: string;
  thumbnail_url?: string;
  is_public: boolean;
  created_at: string;
}

const SUBJECTS = ["Mathematics", "English", "Kiswahili", "Science", "Social Studies", "CRE", "ICT", "Art", "Music", "PE"];
const GRADES = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];

export default function VoraAdminPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VoraVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    video_url: "",
    subject: "Mathematics",
    grade_level: "Grade 1",
    topic: "",
    duration: "",
    thumbnail_url: "",
    is_public: true,
  });

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { toast.error("Not authenticated"); setLoading(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/vora", {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const json = await res.json();
      setVideos(json.videos || []);
    } catch (err) {
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVideos(); }, []);

  const resetForm = () => {
    setForm({ title: "", description: "", video_url: "", subject: "Mathematics", grade_level: "Grade 1", topic: "", duration: "", thumbnail_url: "", is_public: true });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { toast.error("Not authenticated"); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error("Session expired"); return; }

      const url = editingId ? `/api/admin/vora?id=${editingId}` : "/api/admin/vora";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to save"); return; }

      toast.success(editingId ? "Video updated!" : "Video added!");
      resetForm();
      setShowForm(false);
      fetchVideos();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { toast.error("Not authenticated"); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/vora?id=${id}`, {
        method: "DELETE",
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (!res.ok) { toast.error("Failed to delete"); return; }
      toast.success("Video deleted");
      fetchVideos();
    } catch { toast.error("Delete failed"); }
  };

  const handleEdit = (v: VoraVideo) => {
    setForm({
      title: v.title,
      description: v.description || "",
      video_url: v.video_url,
      subject: v.subject,
      grade_level: v.grade_level,
      topic: v.topic || "",
      duration: v.duration || "",
      thumbnail_url: v.thumbnail_url || "",
      is_public: v.is_public,
    });
    setEditingId(v.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filtered = videos.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.subject.toLowerCase().includes(search.toLowerCase()) ||
    v.grade_level.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">VORA Management</h1>
          <p className="text-gray-500">Manage learning video content</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-2" /> {showForm ? "Cancel" : "Add Video"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editingId ? "Edit Video" : "Add New Video"}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Title *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Introduction to Fractions" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">YouTube URL *</label>
              <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subject *</label>
              <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" required>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Grade Level *</label>
              <select value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" required>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Topic</label>
              <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Fractions" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration</label>
              <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="10:30" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none" placeholder="Brief description..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Thumbnail URL</label>
              <Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="is_public" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} className="w-4 h-4" />
              <label htmlFor="is_public" className="text-sm">Public (visible to all students)</label>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button type="submit">{editingId ? "Update Video" : "Add Video"}</Button>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search videos..." className="pl-10" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading videos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No videos found. {search ? "Try a different search." : "Add your first video above."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <Card key={v.id} className="p-4 flex flex-col">
              <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden relative">
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => handleEdit(v)} className="p-1.5 bg-white rounded-md shadow hover:bg-gray-50">
                    <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="p-1.5 bg-white rounded-md shadow hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
              <h4 className="font-semibold text-sm mb-1 line-clamp-2">{v.title}</h4>
              <p className="text-xs text-gray-500 mb-2">{v.subject} · {v.grade_level}</p>
              <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-auto">
                <ExternalLink className="w-3 h-3" /> Open on YouTube
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
