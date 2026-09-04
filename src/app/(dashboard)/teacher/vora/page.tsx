"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  Video, Search, Filter, Play, Plus, Check, Loader2, AlertCircle,
  BookOpen, GraduationCap, Tag, X, ChevronDown, Layers,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const GOLD = "#D4AF37";

interface VoraContent {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  subject_id: string | null;
  grade_level: string | null;
  strand: string | null;
  sub_strand: string | null;
  duration_seconds: number | null;
  tags: string[] | null;
  created_at: string;
  subjects: { name: string | null } | null;
}

interface TeacherClass {
  id: string;
  name: string;
  grade_level: string;
}

export default function TeacherVoraPage() {
  const [content, setContent] = useState<VoraContent[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [selectedContent, setSelectedContent] = useState<VoraContent | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const [contentRes, classesRes] = await Promise.all([
        fetch("/api/vora/content", { headers }),
        fetch("/api/teacher/classes", { headers }),
      ]);

      if (!contentRes.ok) throw new Error("Failed to fetch VORA content");
      const contentData = await contentRes.json();
      setContent(contentData.content || []);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData.classes || []);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load VORA content");
      toast.error(getErrorMessage(err) || "Could not load VORA content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssign = async () => {
    if (!selectedContent || selectedClasses.length === 0) return;
    setAssigning(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch("/api/teacher/vora/assign", {
        method: "POST",
        headers,
        body: JSON.stringify({ content_id: selectedContent.id, class_ids: selectedClasses }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to assign");
      }

      toast.success(`Assigned "${selectedContent.title}" to ${selectedClasses.length} class(es)`);
      setSelectedContent(null);
      setSelectedClasses([]);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  const filtered = content.filter((c) => {
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesGrade = gradeFilter === "all" || c.grade_level === gradeFilter;
    const matchesSubject = subjectFilter === "all" || c.subject_id === subjectFilter;
    return matchesSearch && matchesGrade && matchesSubject;
  });

  const uniqueGrades = Array.from(new Set(content.map((c) => c.grade_level).filter(Boolean)));
  const uniqueSubjects = Array.from(new Map(content.filter((c) => c.subject_id).map((c) => [c.subject_id, c.subjects?.name || ""])).entries());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-8 h-8" style={{ color: GOLD }} />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: `${GOLD}15`, color: GOLD }}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">VORA Content</h1>
          <p className="text-sm text-slate-400 mt-1">Browse and assign video content to your classes</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
        >
          <option value="all">All Grades</option>
          {uniqueGrades.map((g) => <option key={g} value={g!}>{g}</option>)}
        </select>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
        >
          <option value="all">All Subjects</option>
          {uniqueSubjects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </motion.div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.03 }}
            className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden group cursor-pointer hover:border-slate-600/50 transition-all"
            onClick={() => setSelectedContent(item)}
          >
            <div className="relative aspect-video bg-slate-800 flex items-center justify-center">
              {item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <Video className="w-10 h-10 text-slate-600" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-5 h-5 text-white ml-0.5" />
                </div>
              </div>
              {item.duration_seconds && (
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-medium">
                  {Math.floor(item.duration_seconds / 60)}:{String(item.duration_seconds % 60).padStart(2, "0")}
                </span>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-sm font-medium text-white line-clamp-1">{item.title}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description || "No description"}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {item.grade_level && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 border border-slate-700/50 text-slate-400 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />{item.grade_level}
                  </span>
                )}
                {item.subjects?.name && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 border border-slate-700/50 text-slate-400 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />{item.subjects.name}
                  </span>
                )}
                {item.strand && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 border border-slate-700/50 text-slate-400 flex items-center gap-1">
                    <Layers className="w-3 h-3" />{item.strand}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-slate-900/60 border border-slate-700/50 rounded-2xl">
          <Video className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No VORA content found</p>
        </motion.div>
      )}

      {/* Assign Modal */}
      {selectedContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setSelectedContent(null); setSelectedClasses([]); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Assign Content</h3>
              <button onClick={() => { setSelectedContent(null); setSelectedClasses([]); }} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-300 mb-1">{selectedContent.title}</p>
            <p className="text-xs text-slate-500 mb-4">Select classes to assign this content to:</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto mb-4">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => {
                    setSelectedClasses((prev) =>
                      prev.includes(cls.id) ? prev.filter((id) => id !== cls.id) : [...prev, cls.id]
                    );
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    selectedClasses.includes(cls.id)
                      ? "border-[#D4AF37]/50 bg-[#D4AF37]/10"
                      : "border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                    selectedClasses.includes(cls.id) ? "bg-[#D4AF37] border-[#D4AF37]" : "border-slate-600"
                  }`}>
                    {selectedClasses.includes(cls.id) && <Check className="w-3.5 h-3.5 text-slate-900" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{cls.name}</p>
                    <p className="text-xs text-slate-500">{cls.grade_level}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={handleAssign}
              disabled={selectedClasses.length === 0 || assigning}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: GOLD }}
            >
              {assigning ? "Assigning..." : `Assign to ${selectedClasses.length} class(es)`}
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
