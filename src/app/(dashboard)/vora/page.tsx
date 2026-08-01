"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Play, Clock, Bookmark, BookmarkCheck, Search, Filter, BookOpen } from "lucide-react";
import toast from "react-hot-toast";

interface VoraItem {
  id: string;
  title: string;
  subject?: string;
  category?: string;
  topic?: string;
  youtube_url: string;
  summary?: string;
  tags?: string[];
  grade_level: string;
  duration_seconds?: number;
  difficulty?: string;
  thumbnail_url?: string;
  channel?: string;
  source?: string;
}

export default function VoraPage() {
  const { user } = useAuth();
  const [content, setContent] = useState<VoraItem[]>([]);
  const [filtered, setFiltered] = useState<VoraItem[]>([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VoraItem | null>(null);

  const userGrade = user?.role === "student" ? (user as any)?.grade_level : undefined;

  useEffect(() => {
    fetchContent();
    fetchSavedVideos();
  }, []);

  useEffect(() => {
    filterContent();
  }, [content, search, gradeFilter, subjectFilter, categoryFilter]);

  const fetchContent = async () => {
    try {
      const res = await fetch("/api/vora/content?mode=all");
      const data = await res.json();
      setContent(data.content || []);
      setSubjects(data.subjects || []);
      setCategories(data.categories || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSavedVideos = async () => {
    try {
      const res = await fetch("/api/vora/saved-videos");
      const data = await res.json();
      setSavedIds(new Set((data.videos || []).map((v: any) => v.video_id)));
    } catch (err) { console.error(err); }
  };

  const filterContent = useCallback(() => {
    let result = [...content];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.subject?.toLowerCase().includes(q)) ||
        (c.category?.toLowerCase().includes(q)) ||
        (c.topic?.toLowerCase().includes(q)) ||
        (c.tags?.some(t => t.toLowerCase().includes(q)))
      );
    }
    if (gradeFilter !== "all") result = result.filter(c => c.grade_level === gradeFilter);
    if (subjectFilter !== "all") result = result.filter(c => c.subject === subjectFilter);
    if (categoryFilter !== "all") result = result.filter(c => c.category === categoryFilter);
    // Boost user's grade to top
    if (userGrade) {
      result.sort((a, b) => {
        const aMatch = a.grade_level === userGrade ? 1 : 0;
        const bMatch = b.grade_level === userGrade ? 1 : 0;
        return bMatch - aMatch;
      });
    }
    setFiltered(result);
  }, [content, search, gradeFilter, subjectFilter, categoryFilter, userGrade]);

  const toggleSave = async (video: VoraItem) => {
    const isSaved = savedIds.has(video.id);
    try {
      if (isSaved) {
        const res = await fetch(`/api/vora/saved-videos?id=${video.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to remove");
        setSavedIds(prev => { const n = new Set(prev); n.delete(video.id); return n; });
        toast.success("Removed from saved videos");
      } else {
        const res = await fetch("/api/vora/saved-videos", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video_id: video.id, title: video.title, subject: video.subject,
            grade_level: video.grade_level, youtube_url: video.youtube_url,
            summary: video.summary, thumbnail_url: video.thumbnail_url,
            duration_seconds: video.duration_seconds, difficulty: video.difficulty,
          }),
        });
        if (!res.ok) throw new Error("Failed to save");
        setSavedIds(prev => new Set(prev).add(video.id));
        toast.success("Saved for later!");
      }
    } catch (err: any) { toast.error(err.message); }
  };

  const formatDuration = (s?: number) => {
    if (!s) return "Unknown";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const getEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1` : url;
  };

  const gradeOptions = [
    { value: "all", label: "All Grades" }, { value: "playgroup", label: "Playgroup" },
    { value: "pp1", label: "PP1" }, { value: "pp2", label: "PP2" },
    { value: "grade1", label: "Grade 1" }, { value: "grade2", label: "Grade 2" },
    { value: "grade3", label: "Grade 3" }, { value: "grade4", label: "Grade 4" },
    { value: "grade5", label: "Grade 5" }, { value: "grade6", label: "Grade 6" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-bdja-dark flex items-center gap-2"><BookOpen className="w-6 h-6 text-bdja-secondary" /> VORA Learning</h1>
        <p className="text-gray-500 text-sm mt-1">Browse educational videos by grade, subject, and category</p>
      </div>
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search videos, topics, subjects..." className="pl-10" />
        </div>
        <Select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} options={gradeOptions} className="w-full md:w-40" />
        <Select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} options={[{ value: "all", label: "All Subjects" }, ...subjects.map(s => ({ value: s, label: s }))]} className="w-full md:w-40" />
        <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} options={[{ value: "all", label: "All Categories" }, ...categories.map(c => ({ value: c, label: c }))]} className="w-full md:w-40" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No videos found. Try adjusting your filters or search query.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(video => (
            <Card key={video.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="relative aspect-video bg-gray-100 cursor-pointer" onClick={() => setSelectedVideo(video)}>
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Play className="w-10 h-10 text-gray-300" /></div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center"><Play className="w-6 h-6 text-bdja-primary ml-1" /></div>
                </div>
                {video.duration_seconds && <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(video.duration_seconds)}</span>}
                {video.grade_level === userGrade && <span className="absolute top-2 left-2 bg-bdja-secondary text-white text-xs px-2 py-0.5 rounded font-medium">Your Grade</span>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-bdja-dark text-sm line-clamp-2">{video.title}</h3>
                  <button onClick={() => toggleSave(video)} className="shrink-0 text-gray-400 hover:text-bdja-secondary transition-colors">
                    {savedIds.has(video.id) ? <BookmarkCheck className="w-5 h-5 text-bdja-secondary" /> : <Bookmark className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {video.subject && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{video.subject}</span>}
                  {video.category && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{video.category}</span>}
                  {video.difficulty && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded capitalize">{video.difficulty}</span>}
                </div>
                {video.summary && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{video.summary}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedVideo(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="aspect-video bg-black">
              <iframe src={getEmbedUrl(selectedVideo.youtube_url)} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-bdja-dark">{selectedVideo.title}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedVideo.subject && <span className="text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{selectedVideo.subject}</span>}
                {selectedVideo.grade_level && <span className="text-sm bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{selectedVideo.grade_level}</span>}
                {selectedVideo.duration_seconds && <span className="text-sm bg-gray-100 text-gray-700 px-2 py-0.5 rounded flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(selectedVideo.duration_seconds)}</span>}
              </div>
              {selectedVideo.summary && (
                <div className="mt-4">
                  <h4 className="font-semibold text-sm text-bdja-dark mb-1">Summary</h4>
                  <p className="text-sm text-gray-600">{selectedVideo.summary}</p>
                </div>
              )}
              {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-sm text-bdja-dark mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1">{selectedVideo.tags.map(t => <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>)}</div>
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <Button onClick={() => toggleSave(selectedVideo)} variant="outline" className="flex items-center gap-2">
                  {savedIds.has(selectedVideo.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  {savedIds.has(selectedVideo.id) ? "Saved" : "Save Video"}
                </Button>
                <Button onClick={() => setSelectedVideo(null)} variant="primary">Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
