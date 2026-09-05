"use client";

import { useParentContext } from "@/contexts/ParentContext";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { Award, Loader2, TrendingUp, TrendingDown, Minus, FileText } from "lucide-react";

const GOLD = "#D4AF37";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const cardAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

interface Grade {
  id: string;
  score: number;
  max_score: number;
  performance_level: string;
  term: string;
  academic_year: string;
  strand: string | null;
  sub_strand: string | null;
  subjects: { name: string; code: string } | null;
  classes: { name: string; grade_level: string } | null;
}

const performanceColors: Record<string, string> = {
  "Exceeding": "#22c55e",
  "Meeting": "#D4AF37",
  "Approaching": "#f97316",
  "Below": "#ef4444",
};

export default function ParentGrades() {
  const { selectedChild } = useParentContext();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const fetchGrades = useCallback(async () => {
    if (!selectedChild) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
      let url = `/api/parent/grades?child_id=${selectedChild.student_id}`;
      if (term) url += `&term=${term}`;
      if (year) url += `&year=${year}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to fetch grades");
      const data = await res.json();
      setGrades(data.grades || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [selectedChild, term, year]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const avg = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + (g.score / g.max_score) * 100, 0) / grades.length) : null;

  const groupedBySubject: Record<string, Grade[]> = {};
  grades.forEach((g) => {
    const key = g.subjects?.name || "Unknown Subject";
    if (!groupedBySubject[key]) groupedBySubject[key] = [];
    groupedBySubject[key].push(g);
  });

  if (!selectedChild) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Award className="w-16 h-16 text-slate-700 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Select a Child</h2>
        <p className="text-slate-400 text-sm">Choose a child from the dropdown above to view their grades.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Grades & Report Card</h1>
          <p className="text-slate-400 text-sm mt-1">{selectedChild.full_name} · {selectedChild.class_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={term} onChange={(e) => setTerm(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white focus:outline-none focus:border-[#D4AF37]/30">
            <option value="">All Terms</option>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white focus:outline-none focus:border-[#D4AF37]/30">
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Average</p>
          <p className="text-3xl font-bold text-white mt-1">{avg !== null ? `${avg}%` : "—"}</p>
          <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${avg || 0}%`, background: avg && avg >= 70 ? "#22c55e" : avg && avg >= 50 ? "#D4AF37" : "#ef4444" }} />
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Assessments</p>
          <p className="text-3xl font-bold text-white mt-1">{grades.length}</p>
        </div>
        <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Best Performance</p>
          <p className="text-lg font-bold text-white mt-1">
            {grades.length > 0
              ? (() => {
                  const best = grades.reduce((max, g) => (g.score / g.max_score > max.score / max.max_score ? g : max), grades[0]);
                  return `${best.subjects?.name || "Subject"}: ${Math.round((best.score / best.max_score) * 100)}%`;
                })()
              : "—"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : grades.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FileText className="w-12 h-12 text-slate-700 mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No Grades Found</h3>
          <p className="text-slate-500 text-sm">No assessment records available for the selected filters.</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
          {Object.entries(groupedBySubject).map(([subjectName, subjectGrades]) => {
            const subjAvg = Math.round(subjectGrades.reduce((s, g) => s + (g.score / g.max_score) * 100, 0) / subjectGrades.length);
            return (
              <motion.div key={subjectName} variants={cardAnim} className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{subjectName}</h3>
                    <p className="text-xs text-slate-500">{subjectGrades.length} assessment{subjectGrades.length > 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold" style={{ color: subjAvg >= 70 ? "#22c55e" : subjAvg >= 50 ? "#D4AF37" : "#ef4444" }}>{subjAvg}%</p>
                    <p className="text-xs text-slate-500">Average</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {subjectGrades.map((g) => {
                    const pct = Math.round((g.score / g.max_score) * 100);
                    const color = performanceColors[g.performance_level] || "#D4AF37";
                    return (
                      <div key={g.id} className="flex items-center gap-4">
                        <div className="w-24 shrink-0">
                          <p className="text-xs text-slate-400">{g.strand || g.sub_strand || "Assessment"}</p>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                          </div>
                        </div>
                        <div className="w-20 text-right shrink-0">
                          <p className="text-sm font-medium text-white">{g.score}/{g.max_score}</p>
                          <p className="text-[10px]" style={{ color }}>{g.performance_level}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
