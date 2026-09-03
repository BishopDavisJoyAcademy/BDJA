"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Calendar, Clock, CheckCircle2, AlertTriangle,
  Loader2, AlertCircle, FileText, BarChart3, ChevronRight
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

const GOLD = "#D4AF37";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  max_score: number;
  class_name: string | null;
  subject_name: string | null;
  my_status?: string;
  my_grade?: { score: number; max_score: number } | null;
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "submitted" | "graded">("all");

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

        const res = await fetch("/api/assignments", { headers });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to fetch (${res.status})`);
        }
        const data = await res.json();

        // Enrich with my submission status for each assignment
        const enriched = await Promise.all(
          (data.assignments || []).map(async (a: Assignment) => {
            const detailRes = await fetch(`/api/assignments/${a.id}`, { headers });
            if (!detailRes.ok) return { ...a, my_status: "pending", my_grade: null };
            const detail = await detailRes.json();
            return {
              ...a,
              my_status: detail.mySubmission?.status || "pending",
              my_grade: detail.mySubmission?.grade || null,
            };
          })
        );

        setAssignments(enriched);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Could not load assignments");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filtered = assignments.filter((a) => {
    if (filter === "all") return true;
    if (filter === "pending") return a.my_status === "pending" || a.my_status === "not_submitted";
    if (filter === "submitted") return a.my_status === "submitted" || a.my_status === "submitted_late";
    if (filter === "graded") return a.my_status === "graded";
    return true;
  });

  const isOverdue = (due: string) => new Date(due) < new Date();
  const daysUntil = (due: string) => Math.ceil((new Date(due).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const stats = {
    total: assignments.length,
    pending: assignments.filter((a) => a.my_status === "pending" || a.my_status === "not_submitted").length,
    submitted: assignments.filter((a) => a.my_status === "submitted" || a.my_status === "submitted_late").length,
    graded: assignments.filter((a) => a.my_status === "graded").length,
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Assignments</h1>
          <p className="text-sm text-slate-400 mt-0.5">View and submit your assignments</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: GOLD },
          { label: "Pending", value: stats.pending, color: "#f59e0b" },
          { label: "Submitted", value: stats.submitted, color: "#22c55e" },
          { label: "Graded", value: stats.graded, color: "#3b82f6" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
            className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 cursor-pointer hover:border-slate-600/50 transition-colors"
            onClick={() => setFilter(s.label.toLowerCase() as typeof filter)}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</span>
              <span className="text-xl font-bold" style={{ color: s.color }}>{s.value}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Filter tabs */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "pending", "submitted", "graded"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all capitalize ${
              filter === f ? "text-slate-950" : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800"
            }`}
            style={filter === f ? { background: GOLD, border: `1px solid ${GOLD}` } : undefined}>
            {f}
          </button>
        ))}
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
          <CheckCircle2 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white">
            {filter === "all" ? "No assignments yet" : `No ${filter} assignments`}
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            {filter === "all" ? "Your teacher has not posted any assignments yet." : "Check another filter."}
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {filtered.map((a, i) => {
              const overdue = a.due_date && isOverdue(a.due_date) && a.my_status !== "graded";
              const days = a.due_date ? daysUntil(a.due_date) : 0;
              const urgencyColor = a.my_status === "graded" ? "#3b82f6" : overdue ? "#ef4444" : days <= 2 ? "#f59e0b" : "#22c55e";

              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link href={`/student/assignments/${a.id}`}>
                    <div className={`bg-slate-900/60 border rounded-xl p-5 hover:border-slate-600/50 transition-colors cursor-pointer group ${
                      overdue ? "border-red-500/20" : "border-slate-700/50"
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white text-sm">{a.title}</h3>
                            {a.my_status === "graded" && a.my_grade && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${GOLD}15`, color: GOLD }}>
                                {a.my_grade.score}/{a.my_grade.max_score}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1">{a.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
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
                        <div className="text-right shrink-0">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium uppercase border ${
                            a.my_status === "graded"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : a.my_status === "submitted" || a.my_status === "submitted_late"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : overdue
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            {a.my_status === "graded" ? "Graded" : a.my_status === "submitted" ? "Submitted" : a.my_status === "submitted_late" ? "Late" : overdue ? "Overdue" : "Pending"}
                          </span>
                          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors mt-1 ml-auto" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
