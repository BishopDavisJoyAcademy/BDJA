"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { Video, Plus, Play, FileText, CheckCircle, Search, X, Download, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

export default function VoraPage() {
  const { user } = useAuth();
  const [content, setContent] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    transcript: "",
    summary: "",
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
    setFormData({ title: "", description: "", video_url: "", transcript: "", summary: "", grade_level: "grade1", subject_id: "", strand: "", sub_strand: "", specific_learning_outcome: "", visibility: "class" });
    loadData();
  };

  const filtered = content.filter((item) => {
    const matchesSearch = !searchTerm ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.strand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sub_strand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = !gradeFilter || item.grade_level === gradeFilter;
    const matchesSubject = !subjectFilter || item.subject_id === subjectFilter;
    return matchesSearch && matchesGrade && matchesSubject;
  });

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

      {/* Smart Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, strand, sub-strand, or topic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary"
              />
            </div>
            <Select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="w-40">
              <option value="">All Grades</option>
              {["playgroup", "pp1", "pp2", "grade1", "grade2", "grade3", "grade4", "grade5", "grade6"].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
            <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="w-40">
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-400">No VORA content found.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const ytId = getYouTubeId(item.video_url);
            return (
              <Card key={item.id} className="card-hover overflow-hidden">
                <div
                  className="relative h-40 bg-gray-900 flex items-center justify-center cursor-pointer group"
                  onClick={() => setPlayingVideo(item)}
                >
                  {ytId ? (
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                      alt={item.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-bdja-primary to-bdja-accent" />
                  )}
                  <Play className="absolute w-12 h-12 text-white/80 group-hover:text-white group-hover:scale-110 transition-all" />
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                    {ytId ? "YouTube" : "Video"}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-bdja-dark text-sm">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{item.subjects?.name} - {item.grade_level}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                  {(item.strand || item.sub_strand) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.strand && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">{item.strand}</span>}
                      {item.sub_strand && <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full">{item.sub_strand}</span>}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400">By {item.profiles?.full_name}</span>
                    {item.approved && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload VORA Content">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm min-h-[60px]" />
          <Input placeholder="Video URL (YouTube link or direct video URL)" value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} required />
          <p className="text-xs text-gray-400">Supports YouTube links and direct video URLs</p>
          <Select value={formData.grade_level} onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}>
            {["playgroup", "pp1", "pp2", "grade1", "grade2", "grade3", "grade4", "grade5", "grade6"].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
          <Select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}>
            <option value="">Select subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input placeholder="Strand (e.g. Number Work)" value={formData.strand} onChange={(e) => setFormData({ ...formData, strand: e.target.value })} />
          <Input placeholder="Sub-strand (e.g. Counting 1-20)" value={formData.sub_strand} onChange={(e) => setFormData({ ...formData, sub_strand: e.target.value })} />
          <Input placeholder="Specific Learning Outcome" value={formData.specific_learning_outcome} onChange={(e) => setFormData({ ...formData, specific_learning_outcome: e.target.value })} />
          <textarea placeholder="Transcript (optional - for low-data reading)" value={formData.transcript} onChange={(e) => setFormData({ ...formData, transcript: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm min-h-[80px]" />
          <textarea placeholder="Summary (optional - quick read for low bandwidth)" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm min-h-[60px]" />
          <Select value={formData.visibility} onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}>
            {["class", "campus", "cross_campus"].map((v) => (
              <option key={v} value={v}>{v.replace("_", " ").toUpperCase()}</option>
            ))}
          </Select>
          <Button type="submit" variant="primary" className="w-full">Upload for Approval</Button>
        </form>
      </Modal>

      {/* Video Player Modal */}
      <Modal isOpen={!!playingVideo} onClose={() => setPlayingVideo(null)} title={playingVideo?.title || "Video"} className="max-w-4xl">
        {playingVideo && (
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {isYouTubeUrl(playingVideo.video_url) ? (
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(playingVideo.video_url)}?rel=0`}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : (
                <video src={playingVideo.video_url} controls className="w-full h-full" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <a href={playingVideo.video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-bdja-primary hover:underline flex items-center gap-1">
                <ExternalLink className="w-4 h-4" /> Open Original
              </a>
            </div>
            <p className="text-sm text-gray-600">{playingVideo.description}</p>
            {(playingVideo.strand || playingVideo.sub_strand) && (
              <div className="flex flex-wrap gap-2">
                {playingVideo.strand && <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">{playingVideo.strand}</span>}
                {playingVideo.sub_strand && <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">{playingVideo.sub_strand}</span>}
                {playingVideo.specific_learning_outcome && <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-full">{playingVideo.specific_learning_outcome}</span>}
              </div>
            )}
            {playingVideo.transcript && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Transcript</h4>
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{playingVideo.transcript}</p>
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
