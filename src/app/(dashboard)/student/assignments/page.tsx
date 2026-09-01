"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Calendar, AlertCircle, Loader2, Clock,
  CheckCircle2, AlertTriangle, FileText
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

const GOLD = "#D4AF37";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  subject_name?: string;
  status: string;
}

export default function StudentAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch("/api/assignments");
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch assignments (${res.status})`);
        }
        const data = await res.json();
        setAssignments(data.assignments || []);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Could not load assignments. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    fetchAssignments();
  }, []);

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();
  const daysUntil = (dueDate: string) => {
    const diff = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const sortedAssignments = [...assignments].sort((a, b) => {
    const aOverdue = isOverdue(a.due_date);
    const bOverdue = isOverdue(b.due_date);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Assignments</h1>
          <p className="text-sm text-slate-400 mt-0.5">View and track your assignments</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
          <BookOpen className="w-3.5 h-3.5" style={{ color: GOLD }} />
          <span>{assignments.length} Total</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-xl flex items-start gap-2.5"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : sortedAssignments.length === 0 && !error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-16 bg-slate-900/50 border border-slate-700/50 rounded-2xl">
          <CheckCircle2 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white">All caught up!</h3>
          <p className="text-slate-500 text-sm mt-1">No assignments right now. Check back later for new ones.</p>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {sortedAssignments.map((assignment, i) => {
              const overdue = isOverdue(assignment.due_date);
              const days = daysUntil(assignment.due_date);
              const urgencyColor = overdue ? "red" : days <= 2 ? "amber" : "blue";
              const urgencyBg = overdue ? "bg-red-500/10 border-red-500/20" : days <= 2 ? "bg-amber-500/10 border-amber-500/20" : "bg-slate-900/60 border-slate-700/50";
              const urgencyText = overdue ? "text-red-400" : days <= 2 ? "text-amber-400" : "text-slate-400";
              const UrgencyIcon = overdue ? AlertTriangle : days <= 2 ? Clock : Calendar;

              return (
                <motion.div key={assignment.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`rounded-xl p-5 border hover:border-slate-600/50 transition-colors ${urgencyBg}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${overdue ? "bg-red-500/15" : days <= 2 ? "bg-amber-500/15" : "bg-slate-800/80 border border-slate-700/50"}`}>
                        <FileText className="w-6 h-6" style={{ color: overdue ? "#f87171" : days <= 2 ? "#fbbf24" : GOLD }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm">{assignment.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{assignment.description}</p>
                        {assignment.subject_name && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-slate-800 text-slate-400 text-[11px] rounded font-medium">
                            {assignment.subject_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`flex items-center gap-1.5 text-sm font-medium ${urgencyText}`}>
                        <UrgencyIcon className="w-4 h-4" />
                        <span>
                          {overdue ? "Overdue" : days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `${days} days left`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">{new Date(assignment.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
