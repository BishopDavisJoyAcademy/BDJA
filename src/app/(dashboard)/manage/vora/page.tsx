"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Plus, Trash2, Edit3, X, Save, Search, Video, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface VoraVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  subject: string;
  grade_level: string;
  topic: string | null;
  duration: string | null;
  thumbnail_url: string | null;
  is_public: boolean;
  created_at: string;
}

const SUBJECTS = ["Mathematics", "English", "Kiswahili", "Science", "Social Studies", "CRE", "ICT", "Art", "Music", "PE"];
const GRADES = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];

export default function VoraManagementPage() {
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

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ videos: VoraVideo[] }>("/api/admin/vora");
      setVideos(data.videos || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ title: "", description: "", video_url: "", subject: "Mathematics", grade_level: "Grade 1", topic: "", duration: "", thumbnail_url: "", is_public: true });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.video_url.trim()) {
      toast.error("Title and video URL are required");
      return;
    }
    try {
      if (editingId) {
        await apiPut("/api/admin/vora", { id: editingId, ...form });
        toast.success("Video updated");
      } else {
        await apiPost("/api/admin/vora", form);
        toast.success("Video added");
      }
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
      await apiDelete(`/api/admin/vora?id=${id}`);
      setVideos((prev) => prev.filter((v) => v.id !== id));
      toast.success("Video deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleEdit = (vid: VoraVideo) => {
    setForm({
      title: vid.title,
      description: vid.description || "",
      video_url: vid.video_url,
      subject: vid.subject,
      grade_level: vid.grade_level,
      topic: vid.topic || "",
      duration: vid.duration || "",
      thumbnail_url: vid.thumbnail_url || "",
      is_public: vid.is_public,
    });
    setEditingId(vid.id);
    setShowForm(true);
  };

  const filtered = videos.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.subject.toLowerCase().includes(search.toLowerCase()) ||
    (v.topic || "").toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-2xl font-bold text-white">VORA Video Management</h1>
          <p className="text-sm text-gray-400 mt-1">Manage learning video content for students</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search videos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
          <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> Add Video</>}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="font-semibold text-white mb-4">{editingId ? "Edit Video" : "New Video"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Title *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Video title" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Video URL *</label>
                <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="YouTube / Video URL" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subject</label>
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Grade Level</label>
                <select value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Topic / Unit</label>
                <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Algebra" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duration</label>
                <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 10:30" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Thumbnail URL</label>
                <Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm resize-y" placeholder="Video description..." />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <input type="checkbox" id="vora-pub" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} className="w-4 h-4 rounded border-gray-600 text-amber-400" />
                <label htmlFor="vora-pub" className="text-sm text-gray-300">Publicly visible</label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit"><Save className="w-4 h-4 mr-1" />{editingId ? "Update Video" : "Save Video"}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((vid) => (
          <Card key={vid.id} className="overflow-hidden">
            <div className="aspect-video bg-slate-800 relative">
              {vid.thumbnail_url ? (
                <Image src={vid.thumbnail_url} alt={vid.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="w-10 h-10 text-gray-600" />
                </div>
              )}
              {vid.duration && <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">{vid.duration}</span>}
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-medium text-white text-sm line-clamp-1">{vid.title}</h3>
                <Badge variant={vid.is_public ? "success" : "default"} className="text-[10px]">{vid.is_public ? <><Eye className="w-3 h-3 mr-0.5" />Public</> : <><EyeOff className="w-3 h-3 mr-0.5" />Private</>}</Badge>
              </div>
              <p className="text-xs text-gray-400">{vid.subject} · {vid.grade_level}</p>
              {vid.topic && <p className="text-xs text-gray-500 mt-0.5">{vid.topic}</p>}
              <p className="text-xs text-gray-500 line-clamp-2 mt-1">{vid.description}</p>
              <div className="flex gap-1 mt-3">
                <a href={vid.video_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button type="button" size="sm" variant="outline" className="w-full text-xs"><ExternalLink className="w-3 h-3 mr-1" />Watch</Button>
                </a>
                <Button type="button" size="sm" variant="ghost" onClick={() => handleEdit(vid)}><Edit3 className="w-4 h-4" /></Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => handleDelete(vid.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No VORA videos found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
