"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { Video, Plus, Play, FileText, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function VoraPage() {
  const { user } = useAuth();
  const [content, setContent] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    grade_level: "grade1",
    subject_id: "",
    strand: "",
    sub_strand: "",
    specific_learning_outcome: "",
    visibility: "class",
  });
  const [loading, setLoading] = useState(true);

  const canEdit = user ? hasPermission(user.role, "editVora") : false;

  useEffect(() => {
    if (!user) return;
    loadData();
    loadSubjects();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vora_content")
      .select("*, subjects(name), profiles(full_name)")
      .eq("approved", true)
      .order("created_at", { ascending: false });
    setContent(data || []);
    setLoading(false);
  };

  const loadSubjects = async () => {
    const { data } = await supabase.from("subjects").select("*").order("name");
    setSubjects(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) { toast.error("No permission"); return; }

    const payload = {
      ...formData,
      campus_id: user?.campus_id,
      uploaded_by: user?.id,
      approved: false,
    };

    const { error } = await supabase.from("vora_content").insert(payload);
    if (error) { toast.error("Failed to upload"); return; }
    toast.success("Content uploaded for approval");
    setIsModalOpen(false);
    setFormData({ title: "", description: "", video_url: "", grade_level: "grade1", subject_id: "", strand: "", sub_strand: "", specific_learning_outcome: "", visibility: "class" });
    loadData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bdja-dark">VORA Learning Hub</h1>
          <p className="text-gray-500 text-sm mt-1">Vision - Opportunity - Resilience - Achievement</p>
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Upload Content
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : content.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-400">No VORA content yet.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {content.map((item) => (
            <Card key={item.id} className="card-hover overflow-hidden">
              <div className="relative h-40 bg-gray-900 flex items-center justify-center cursor-pointer group" onClick={() => setPlayingVideo(item)}>
                <Play className="w-12 h-12 text-white/80 group-hover:text-white group-hover:scale-110 transition-all" />
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">Video</div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-bdja-dark text-sm">{item.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{item.subjects?.name} - {item.grade_level}</p>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">By {item.profiles?.full_name}</span>
                  {item.approved && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload VORA Content">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm min-h-[60px]" />
          <Input placeholder="Video URL" value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} required />
          <Select value={formData.grade_level} onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}>
            {["playgroup", "pp1", "pp2", "grade1", "grade2", "grade3", "grade4", "grade5", "grade6"].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
          <Select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}>
            <option value="">Select subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input placeholder="Strand" value={formData.strand} onChange={(e) => setFormData({ ...formData, strand: e.target.value })} />
          <Input placeholder="Sub-strand" value={formData.sub_strand} onChange={(e) => setFormData({ ...formData, sub_strand: e.target.value })} />
          <Input placeholder="Specific Learning Outcome" value={formData.specific_learning_outcome} onChange={(e) => setFormData({ ...formData, specific_learning_outcome: e.target.value })} />
          <Select value={formData.visibility} onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}>
            {["class", "campus", "cross_campus"].map((v) => (
              <option key={v} value={v}>{v.replace("_", " ").toUpperCase()}</option>
            ))}
          </Select>
          <Button type="submit" variant="primary" className="w-full">Upload for Approval</Button>
        </form>
      </Modal>

      <Modal isOpen={!!playingVideo} onClose={() => setPlayingVideo(null)} title={playingVideo?.title || "Video"} className="max-w-3xl">
        {playingVideo && (
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video src={playingVideo.video_url} controls className="w-full h-full" />
            </div>
            <p className="text-sm text-gray-600">{playingVideo.description}</p>
            {playingVideo.transcript && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Transcript</h4>
                <p className="text-xs text-gray-600">{playingVideo.transcript}</p>
              </div>
            )}
            {playingVideo.summary && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2 text-blue-800">Summary</h4>
                <p className="text-xs text-blue-600">{playingVideo.summary}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
