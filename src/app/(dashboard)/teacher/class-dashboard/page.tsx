"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, Clock, BookOpen, AlertTriangle, Award,
  BarChart3, Loader2, AlertCircle, ChevronDown, GraduationCap,
  ArrowUpRight, ArrowDownRight, Activity, FileText,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const GOLD = "#D4AF37";

interface ClassInfo {
  id: string;
  name: string;
  grade_level: string;
  class_teacher_id: string;
  profiles: { full_name: string } | null;
}

interface AtRiskStudent {
  id: string;
  name: string;
  avatar_url: string | null;
  admission_number: string;
  avg: number;
  attRate: number;
  assignRate: number;
  risk: "high" | "medium";
}

interface SubjectPerf {
  subject_id: string;
  subject_name: string;
  average: number;
  student_count: number;
}

export default function TeacherClassDashboardPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [stats, setStats] = useState({ avg_grade: 0, attendance_rate: 0, assignment_completion: 0 });
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [subjects, setSubjects] = useState<SubjectPerf[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchClasses = useCallback(async () => {
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch("/api/teacher/classes", { headers });
      if (!res.ok) throw new Error("Failed to fetch classes");
      const data = await res.json();
      setClasses(data.classes || []);
      if (data.classes?.length > 0) {
        setSelectedClass(data.classes[0]);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Could not load classes");
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    setError("");
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch(`/api/teacher/class-dashboard?class_id=${selectedClass.id}`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch dashboard");
      }
      const data = await res.json();
      setStats(data.stats || { avg_grade: 0, attendance_rate: 0, assignment_completion: 0 });
      setAtRisk(data.at_risk || []);
      setSubjects(data.subject_performance || []);
      setTotalStudents(data.total_students || 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load dashboard");
      toast.error(getErrorMessage(err) || "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (classes.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <GraduationCap className="w-12 h-12 text-slate-700" />
        <p className="text-slate-500 text-sm">You are not assigned to any classes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Class Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor class performance and identify at-risk students</p>
        </div>
        {classes.length > 1 && (
          <div className="relative">
            <select
              value={selectedClass?.id || ""}
              onChange={(e) => {
                const cls = classes.find((c) => c.id === e.target.value);
                if (cls) setSelectedClass(cls);
              }}
              className="appearance-none px-4 py-2 pr-10 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.grade_level})</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        )}
      </motion.div>

      {selectedClass && (
        <>
          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {[
              { label: "Students", value: totalStudents, color: GOLD, icon: Users, sub: `${totalStudents} enrolled` },
              { label: "Avg Grade", value: `${stats.avg_grade}%`, color: stats.avg_grade >= 60 ? "#22c55e" : stats.avg_grade >= 40 ? "#f59e0b" : "#ef4444", icon: TrendingUp, sub: "Class average" },
              { label: "Attendance", value: `${stats.attendance_rate}%`, color: stats.attendance_rate >= 75 ? "#22c55e" : stats.attendance_rate >= 50 ? "#f59e0b" : "#ef4444", icon: Clock, sub: "Last 14 days" },
              { label: "Assignments", value: `${stats.assignment_completion}%`, color: stats.assignment_completion >= 70 ? "#22c55e" : stats.assignment_completion >= 40 ? "#f59e0b" : "#ef4444", icon: FileText, sub: "Completion rate" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.03 }}
                className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{s.label}</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.sub}</p>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* At-Risk Students */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h2 className="text-sm font-medium text-white">At-Risk Students</h2>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                  {atRisk.length} flagged
                </span>
              </div>
              {atRisk.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No at-risk students — great job!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/30 max-h-[400px] overflow-y-auto">
                  {atRisk.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.03 }}
                      className="p-4 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-sm font-bold shrink-0" style={{ color: GOLD }}>
                        {s.name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{s.name}</p>
                        <p className="text-[10px] text-slate-500">{s.admission_number}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="flex items-center gap-0.5" style={{ color: s.avg < 50 ? "#ef4444" : "#f59e0b" }}>
                          <TrendingUp className="w-3 h-3" />
                          {s.avg}%
                        </span>
                        <span className="flex items-center gap-0.5" style={{ color: s.attRate < 60 ? "#ef4444" : "#f59e0b" }}>
                          <Clock className="w-3 h-3" />
                          {s.attRate}%
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        s.risk === "high" ? "bg-red-500/15 text-red-400 border border-red-500/30" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}>
                        {s.risk}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Subject Performance */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" style={{ color: GOLD }} />
                  <h2 className="text-sm font-medium text-white">Subject Performance</h2>
                </div>
              </div>
              {subjects.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No assessment data yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/30 max-h-[400px] overflow-y-auto">
                  {subjects.map((subj, i) => (
                    <motion.div
                      key={subj.subject_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.03 }}
                      className="p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{subj.subject_name}</span>
                        <span className="text-sm font-bold" style={{ color: subj.average >= 60 ? "#22c55e" : subj.average >= 40 ? "#f59e0b" : "#ef4444" }}>
                          {subj.average}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${subj.average}%` }}
                          transition={{ duration: 0.8, delay: 0.35 + i * 0.05 }}
                          className="h-full rounded-full"
                          style={{
                            background: subj.average >= 60 ? "#22c55e" : subj.average >= 40 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{subj.student_count} assessments</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
