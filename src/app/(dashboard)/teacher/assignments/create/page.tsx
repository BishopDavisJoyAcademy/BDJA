"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, Loader2, AlertCircle, BookOpen,
  Calendar, Hash, FileText, Upload, X
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const GOLD = "#D4AF37";

interface ClassInfo {
  id: string;
  name: string;
  grade_level: string;
}

interface SubjectInfo {
  id: string;
  name: string;
  code: string;
}

export default function CreateAssignmentPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState(100);
  const [attachments, setAttachments] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

        const res = await fetch("/api/teacher/subjects", { headers });
        if (!res.ok) throw new Error("Failed to load classes and subjects");
        const data = await res.json();
        setClasses(data.classes || []);
        setSubjects(data.subjects || []);
        if (data.classes?.length > 0) setClassId(data.classes[0].id);
        if (data.subjects?.length > 0) setSubjectId(data.subjects[0].id);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Could not load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !classId || !subjectId || !dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch("/api/assignments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          description,
          class_id: classId,
          subject_id: subjectId,
          due_date: new Date(dueDate).toISOString(),
          max_score: maxScore,
          status: "published",
          attachments: attachments.length > 0 ? attachments : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create assignment");

      toast.success("Assignment created successfully");
      router.push("/teacher/assignments");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to create assignment");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3">
        <button onClick={() => router.push("/teacher/assignments")}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Assignment</h1>
          <p className="text-sm text-slate-400">Set up a new assignment for your students</p>
        </div>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="p-3 rounded-xl flex items-start gap-2.5"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </motion.div>
      )}

      <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        onSubmit={handleSubmit} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Title <span className="text-red-400">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
            className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
            placeholder="e.g. Mathematics Quiz — Fractions" />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
            className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 resize-none"
            placeholder="Instructions, requirements, resources..." />
        </div>

        {/* Class & Subject */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Class <span className="text-red-400">*</span></label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} required
              className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/50">
              <option value="">Select class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.grade_level}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Subject <span className="text-red-400">*</span></label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required
              className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/50">
              <option value="">Select subject...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Due Date & Max Score */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Due Date <span className="text-red-400">*</span></label>
            <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required
              className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/50 [color-scheme:dark]" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Max Score</label>
            <input type="number" value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} min={1} max={1000}
              className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/50" />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2 flex gap-3">
          <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: GOLD, color: "#0a1628" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Assignment
          </motion.button>
          <button type="button" onClick={() => router.push("/teacher/assignments")}
            className="px-5 py-2.5 rounded-xl font-medium text-sm border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all">
            Cancel
          </button>
        </div>
      </motion.form>
    </div>
  );
}
