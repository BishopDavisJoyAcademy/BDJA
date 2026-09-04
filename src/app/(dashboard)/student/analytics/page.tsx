"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, Cell, Legend,
} from "recharts";
import {
  TrendingUp, Award, BookOpen, Target, Loader2, AlertCircle,
  GraduationCap, BarChart3, Activity,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

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
}

interface TermAverage {
  term: string;
  academic_year: string;
  average: number;
  count: number;
}

interface SubjectAverage {
  subject: string;
  average: number;
  max: number;
}

const performanceColors: Record<string, string> = {
  excellent: "#22c55e",
  good: "#3b82f6",
  average: "#f59e0b",
  below_average: "#ef4444",
  poor: "#dc2626",
};

export default function StudentAnalyticsPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch("/api/grades", { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch grades");
      }
      const data = await res.json();
      setGrades(data.grades || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load grades");
      toast.error(getErrorMessage(err) || "Could not load grades");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  // Computed data
  const termAverages: TermAverage[] = useMemo(() => {
    const grouped = new Map<string, { scores: number[]; maxScores: number[] }>();
    grades.forEach((g) => {
      const key = `${g.academic_year} ${g.term}`;
      if (!grouped.has(key)) grouped.set(key, { scores: [], maxScores: [] });
      grouped.get(key)!.scores.push(g.score);
      grouped.get(key)!.maxScores.push(g.max_score);
    });

    return Array.from(grouped.entries())
      .map(([key, { scores, maxScores }]) => {
        const totalScore = scores.reduce((a, b) => a + b, 0);
        const totalMax = maxScores.reduce((a, b) => a + b, 0);
        return {
          term: key,
          academic_year: key.split(" ")[0],
          average: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
          count: scores.length,
        };
      })
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [grades]);

  const subjectAverages: SubjectAverage[] = useMemo(() => {
    const grouped = new Map<string, { scores: number[]; maxScores: number[] }>();
    grades.forEach((g) => {
      const subject = g.subject_name || g.subject_id;
      if (!grouped.has(subject)) grouped.set(subject, { scores: [], maxScores: [] });
      grouped.get(subject)!.scores.push(g.score);
      grouped.get(subject)!.maxScores.push(g.max_score);
    });

    return Array.from(grouped.entries())
      .map(([subject, { scores, maxScores }]) => {
        const totalScore = scores.reduce((a, b) => a + b, 0);
        const totalMax = maxScores.reduce((a, b) => a + b, 0);
        return {
          subject: subject.length > 12 ? subject.slice(0, 12) + "..." : subject,
          average: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
          max: 100,
        };
      })
      .sort((a, b) => b.average - a.average);
  }, [grades]);

  const overallAverage = useMemo(() => {
    if (grades.length === 0) return 0;
    const totalScore = grades.reduce((sum, g) => sum + g.score, 0);
    const totalMax = grades.reduce((sum, g) => sum + g.max_score, 0);
    return totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  }, [grades]);

  const performanceDistribution = useMemo(() => {
    const dist: Record<string, number> = { excellent: 0, good: 0, average: 0, below_average: 0, poor: 0 };
    grades.forEach((g) => {
      const level = g.performance_level || "average";
      dist[level] = (dist[level] || 0) + 1;
    });
    return Object.entries(dist)
      .filter(([, count]) => count > 0)
      .map(([level, count]) => ({
        level: level.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        count,
        color: performanceColors[level] || "#94a3b8",
      }));
  }, [grades]);

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
        <button onClick={fetchGrades} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: `${GOLD}15`, color: GOLD }}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold text-white">Progress Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">Track your academic performance over time</p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Overall Average", value: `${overallAverage}%`, color: GOLD, icon: Target },
          { label: "Total Grades", value: grades.length, color: "#3b82f6", icon: BookOpen },
          { label: "Subjects", value: subjectAverages.length, color: "#22c55e", icon: GraduationCap },
          { label: "Terms", value: termAverages.length, color: "#a855f7", icon: Activity },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.03 }}
            className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Grade Trend Chart */}
      {termAverages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: GOLD }} />
            <h2 className="text-sm font-medium text-white">Grade Trend Over Time</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={termAverages}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.3)" />
                <XAxis dataKey="term" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#475569" fontSize={11} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid rgba(51, 65, 85, 0.5)", borderRadius: "12px", fontSize: "12px" }}
                  itemStyle={{ color: GOLD }}
                  formatter={(value: number) => [`${value}%`, "Average"]}
                />
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke={GOLD}
                  strokeWidth={2}
                  dot={{ fill: GOLD, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: GOLD }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Subject Performance Radar + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {subjectAverages.length > 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4" style={{ color: GOLD }} />
              <h2 className="text-sm font-medium text-white">Subject Performance</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={subjectAverages}>
                  <PolarGrid stroke="rgba(51, 65, 85, 0.3)" />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                  <PolarRadiusAxis domain={[0, 100]} stroke="#475569" fontSize={10} />
                  <Radar
                    name="Average %"
                    dataKey="average"
                    stroke={GOLD}
                    fill={GOLD}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid rgba(51, 65, 85, 0.5)", borderRadius: "12px", fontSize: "12px" }}
                    itemStyle={{ color: GOLD }}
                    formatter={(value: number) => [`${value}%`, "Average"]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {performanceDistribution.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4" style={{ color: GOLD }} />
              <h2 className="text-sm font-medium text-white">Performance Distribution</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.3)" />
                  <XAxis dataKey="level" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid rgba(51, 65, 85, 0.5)", borderRadius: "12px", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {performanceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      {/* Subject Rankings */}
      {subjectAverages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
        >
          <div className="p-5 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" style={{ color: GOLD }} />
              <h2 className="text-sm font-medium text-white">Subject Rankings</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-700/30">
            {subjectAverages.map((subj, i) => (
              <motion.div
                key={subj.subject}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.03 }}
                className="p-4 flex items-center gap-4"
              >
                <span className="w-6 text-center text-sm font-bold" style={{ color: GOLD }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{subj.subject}</p>
                  <div className="h-2 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${subj.average}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
                      className="h-full rounded-full"
                      style={{
                        background:
                          subj.average >= 80
                            ? "#22c55e"
                            : subj.average >= 60
                            ? "#3b82f6"
                            : subj.average >= 40
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    />
                  </div>
                </div>
                <span
                  className="text-sm font-bold"
                  style={{
                    color:
                      subj.average >= 80
                        ? "#22c55e"
                        : subj.average >= 60
                        ? "#3b82f6"
                        : subj.average >= 40
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                >
                  {subj.average}%
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {grades.length === 0 && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-slate-900/60 border border-slate-700/50 rounded-2xl">
          <BarChart3 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No grade data available yet</p>
        </motion.div>
      )}
    </div>
  );
}
