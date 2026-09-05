"use client";

import { useParentContext } from "@/contexts/ParentContext";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { BookOpen, Loader2, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const GOLD = "#D4AF37";
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const cardAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

interface Assignment {
  id: string; title: string; description: string | null; due_date: string; max_score: number;
  status: string; subjects: { name: string; code: string } | null; profiles: { full_name: string } | null;
  submission_status: string; submitted_at: string | null; grade: number | null; is_overdue: boolean;
}

export default function ParentAssignments() {
  const { selectedChild } = useParentContext();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "submitted" | "overdue">("all");

  const fetchAssignments = useCallback(async () => {
    if (!selectedChild) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
      const res = await fetch(`/api/parent/assignments?child_id=${selectedChild.student_id}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch assignments");
      const data = await res.json();
      setAssignments(data.assignments || []);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setLoading(false); }
  }, [selectedChild]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const filtered = assignments.filter((a) => {
    if (filter === "all") return true;
    if (filter === "pending") return a.submission_status !== "submitted" && !a.is_overdue;
    if (filter === "submitted") return a.submission_status === "submitted";
    if (filter === "overdue") return a.is_overdue;
    return true;
  });

  const filters = [
    { key: "all" as const, label: `All (${assignments.length})` },
    { key: "pending" as const, label: `Pending (${assignments.filter((a) => a.submission_status !== "submitted" && !a.is_overdue).length})` },
    { key: "submitted" as const, label: `Submitted (${assignments.filter((a) => a.submission_status === "submitted").length})` },
    { key: "overdue" as const, label: `Overdue (${assignments.filter((a) => a.is_overdue).length})` },
  ];

  if (!selectedChild) return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <BookOpen className="w-16 h-16 text-slate-700 mb-4" />
      <h2 className="text-xl font-semibold text-white mb-2">Select a Child</h2>
      <p className="text-slate-400 text-sm">Choose a child to view their assignments.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Assignments</h1>
        <p className="text-slate-400 text-sm mt-1">{selectedChild.full_name} · {selectedChild.class_name}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.key ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25" : "bg-slate-800/50 text-slate-400 border border-slate-700/30 hover:text-slate-200"}`}>
            {f.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <BookOpen className="w-12 h-12 text-slate-700 mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No Assignments</h3>
          <p className="text-slate-500 text-sm">No assignments match the selected filter.</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {filtered.map((a) => {
            const isSubmitted = a.submission_status === "submitted";
            const dueDate = a.due_date ? new Date(a.due_date) : null;
            const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000) : null;
            return (
              <motion.div key={a.id} variants={cardAnim} className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5 hover:border-slate-600/50 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-white truncate">{a.title}</h3>
                      {a.is_overdue && !isSubmitted && <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">Overdue</span>}
                      {isSubmitted && <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">Submitted</span>}
                    </div>
                    <p className="text-xs text-slate-500">{a.subjects?.name} · {a.profiles?.full_name || "Teacher"}</p>
                    {a.description && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{a.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {a.grade !== null && <p className="text-lg font-bold text-white">{a.grade}<span className="text-xs text-slate-500 font-normal">/{a.max_score}</span></p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800/50 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {dueDate ? (
                      <span className={a.is_overdue && !isSubmitted ? "text-red-400" : daysLeft !== null && daysLeft <= 2 && !isSubmitted ? "text-amber-400" : ""}>
                        Due {dueDate.toLocaleDateString()}{daysLeft !== null && !isSubmitted && ` · ${daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d ago`}`}
                      </span>
                    ) : "No due date"}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {isSubmitted ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Submitted{a.submitted_at ? ` ${new Date(a.submitted_at).toLocaleDateString()}` : ""}</span></>
                    : <><AlertCircle className="w-3.5 h-3.5 text-amber-400" /><span className="text-amber-400">Pending</span></>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
