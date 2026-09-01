"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, TrendingUp, Award, BookOpen, Loader2,
  AlertCircle
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

const GOLD = "#D4AF37";

interface Grade {
  id: string;
  subject_id: string;
  subject_name?: string;
  score: number;
  max_score: number;
  term: string;
  academic_year: string;
  performance_level: string;
  strand: string;
  sub_strand: string;
}

const performanceConfig: Record<string, { color: string; bg: string; border: string }> = {
  exceeding: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  meeting: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  approaching: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  below: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

export default function StudentGradesPage() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");

  useEffect(() => {
    async function fetchGrades() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
        const res = await fetch("/api/grades", { headers });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch grades (${res.status})`);
        }
        const data = await res.json();
        setGrades(data.grades || data.assessments || []);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Could not load grades. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    fetchGrades();
  }, []);

  const terms = ["all", ...Array.from(new Set(grades.map((g) => g.term)))];
  const filteredGrades = selectedTerm === "all" ? grades : grades.filter((g) => g.term === selectedTerm);

  const avgScore = grades.length > 0
    ? Math.round((grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.reduce((sum, g) => sum + (g.max_score || 1), 0)) * 100)
    : 0;

  const getPerformanceStyle = (level: string) => performanceConfig[level] || performanceConfig.below;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Grades</h1>
          <p className="text-sm text-slate-400 mt-0.5">View your academic performance across all subjects</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
            <Award className="w-3.5 h-3.5" style={{ color: GOLD }} />
            <span>{grades.length} Assessments</span>
          </div>
          {grades.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              <span>{avgScore}% Average</span>
            </div>
          )}
        </div>
      </motion.div>

      {terms.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex gap-2 overflow-x-auto pb-1">
          {terms.map((term) => (
            <button key={term} onClick={() => setSelectedTerm(term)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedTerm === term ? "text-slate-950" : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800"
              }`}
              style={selectedTerm === term ? { background: GOLD, border: `1px solid ${GOLD}` } : undefined}>
              {term === "all" ? "All Terms" : term}
            </button>
          ))}
        </motion.div>
      )}

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
      ) : filteredGrades.length === 0 && !error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-16 bg-slate-900/50 border border-slate-700/50 rounded-2xl">
          <ClipboardList className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white">No grades recorded yet</h3>
          <p className="text-slate-500 text-sm mt-1">Your grades will appear here once your teachers enter them.</p>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredGrades.map((grade, i) => {
              const cfg = getPerformanceStyle(grade.performance_level);
              const percentage = Math.round(((grade.score || 0) / (grade.max_score || 1)) * 100);
              return (
                <motion.div key={grade.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6" style={{ color: GOLD }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm">{grade.subject_name || grade.subject_id}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{grade.strand} — {grade.sub_strand}</p>
                        <p className="text-[11px] text-slate-600 mt-1">{grade.term} · {grade.academic_year}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xl font-bold text-white">{grade.score ?? "—"}</span>
                        <span className="text-sm text-slate-500">/{grade.max_score}</span>
                      </div>
                      <div className="mt-1.5 w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.6, delay: i * 0.05 }}
                          className="h-full rounded-full"
                          style={{ background: percentage >= 80 ? "#22c55e" : percentage >= 60 ? GOLD : "#ef4444" }} />
                      </div>
                      <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-medium capitalize border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        {grade.performance_level}
                      </span>
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
