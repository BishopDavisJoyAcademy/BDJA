"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  BookOpen, Plus, Calendar, Clock, Users, Filter,
  Loader2, AlertCircle, ChevronRight, CheckCircle2,
  XCircle, FileText, BarChart3
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const GOLD = "#D4AF37";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  max_score: number;
  class_name: string | null;
  grade_level: string | null;
  subject_name: string | null;
  subject_code: string | null;
}

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

export default function TeacherAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

        const [assignRes, subjectsRes] = await Promise.all([
          fetch("/api/assignments", { headers }),
          fetch("/api/teacher/subjects", { headers }),
        ]);

        if (!assignRes.ok) throw new Error("Failed to fetch assignments");
        if (!subjectsRes.ok) throw new Error("Failed to fetch subjects");

        const assignData = await assignRes.json();
        const subjData = await subjectsRes.json();

        setAssignments(assignData.assignments || []);
        setClasses(subjData.classes || []);
        setSubjects(subjData.subjects || []);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Could not load assignments");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = assignments.filter((a) => {
    if (filterClass !== "all" && a.class_name !== filterClass) return false;
    if (filterSubject !== "all" && a.subject_name !== filterSubject) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: assignments.length,
    published: assignments.filter((a) => a.status === "published").length,
    closed: assignments.filter((a) => a.status === "closed").length,
    overdue: assignments.filter((a) => a.due_date && new Date(a.due_date) < new Date() && a.status !== "closed").length,
  };

  const isOverdue = (due: string) => new Date(due) < new Date();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Assignments</h1>
          <p className="text-sm text-slate-400 mt-0.5">Create and manage assignments for your classes</p>
        </div>
        <Link href="/teacher/assignments/create">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
            style={{ background: GOLD, color: "#0a1628" }}
          >
            <Plus className="w-4 h-4" />
            Create Assignment
          </motion.button>
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: BookOpen, color: GOLD },
          { label: "Active", value: stats.published, icon: CheckCircle2, color: "#22c55e" },
          { label: "Closed", value: stats.closed, icon: XCircle, color: "#64748b" },
          { label: "Overdue", value: stats.overdue, icon: Clock, color: "#ef4444" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
            className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              <span className="text-2xl font-bold text-white">{stat.value}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-2">
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2 bg-slate-800/50 border border-slate-700/60 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/50">
          <option value="all">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.name}>{c.name} — {c.grade_level}</option>
          ))}
        </select>
        <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
          className="px-3 py-2 bg-slate-800/50 border border-slate-700/60 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/50">
          <option value="all">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-slate-800/50 border border-slate-700/60 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400/50">
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="p-3 rounded-xl flex items-start gap-2.5"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-16 bg-slate-900/50 border border-slate-700/50 rounded-2xl">
          <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white">No assignments yet</h3>
          <p className="text-slate-500 text-sm mt-1">Create your first assignment for your students.</p>
        </motion.div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {filtered.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Link href={`/teacher/assignments/${a.id}`}>
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white text-sm">{a.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase border ${
                            a.status === "published"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-slate-700/50 text-slate-400 border-slate-600/30"
                          }`}>{a.status}</span>
                          {a.due_date && isOverdue(a.due_date) && a.status !== "closed" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">Overdue</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">{a.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {a.class_name} {a.grade_level}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            {a.subject_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {a.due_date ? new Date(a.due_date).toLocaleDateString("en-GB") : "No due date"}
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5" />
                            {a.max_score} pts
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
