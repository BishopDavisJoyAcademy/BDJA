"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Users, TrendingUp, Clock, BookOpen, AlertTriangle, Award,
  BarChart3, Loader2, AlertCircle, ChevronDown, GraduationCap,
  ArrowUpRight, ArrowDownRight, Activity, FileText, ClipboardCheck,
  Calendar, Search, ChevronRight, MessageSquare, Eye,
  Pencil, CheckCircle, XCircle, Sparkles,
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

interface StudentSummary {
  id: string;
  name: string;
  avatar_url: string | null;
  admission_number: string;
  avg: number;
  attRate: number;
  assignRate: number;
  risk: "high" | "medium" | "low";
}

interface SubjectPerf {
  subject_id: string;
  subject_name: string;
  average: number;
  student_count: number;
}

interface DashboardData {
  class: ClassInfo | null;
  total_students: number;
  stats: {
    avg_grade: number;
    attendance_rate: number;
    assignment_completion: number;
  };
  at_risk: StudentSummary[];
  subject_performance: SubjectPerf[];
  students: StudentSummary[];
}

interface TimetableEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  topic: string | null;
  subjects: { name: string; code: string | null } | null;
}

export default function TeacherClassDashboardPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const getHeaders = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
    return headers;
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/teacher/classes", { headers });
      if (!res.ok) throw new Error("Failed to fetch classes");
      const d = await res.json();
      const list = d.classes || [];
      setClasses(list);
      if (list.length > 0 && !selectedClass) {
        setSelectedClass(list[0]);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Could not load classes");
    }
  }, [getHeaders, selectedClass]);

  const fetchDashboard = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    setError("");
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/teacher/class-dashboard?class_id=${selectedClass.id}`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch dashboard");
      }
      const d: DashboardData = await res.json();
      setData(d);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load dashboard");
      toast.error(getErrorMessage(err) || "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [selectedClass, getHeaders]);

  const fetchTodaySchedule = useCallback(async () => {
    if (!selectedClass) return;
    try {
      const headers = await getHeaders();
      const today = new Date().getDay();
      const dayOfWeek = today === 0 ? 7 : today; // 1=Monday, 7=Sunday
      const res = await fetch(`/api/teacher/timetables?class_id=${selectedClass.id}`, { headers });
      if (!res.ok) return;
      const d = await res.json();
      const entries: TimetableEntry[] = (d.timetable || []).filter(
        (e: TimetableEntry) => e.day_of_week === dayOfWeek
      );
      entries.sort((a, b) => a.start_time.localeCompare(b.start_time));
      setTodaySchedule(entries);
    } catch (err) {
      console.error("Failed to fetch schedule:", err);
    }
  }, [selectedClass, getHeaders]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchDashboard();
    fetchTodaySchedule();
  }, [fetchDashboard, fetchTodaySchedule]);

  const stats = data?.stats || { avg_grade: 0, attendance_rate: 0, assignment_completion: 0 };
  const totalStudents = data?.total_students || 0;
  const atRisk = data?.at_risk || [];
  const subjects = data?.subject_performance || [];
  const allStudents = data?.students || [];

  const filteredStudents = useMemo(() => {
    let list = allStudents;
    if (riskFilter !== "all") {
      list = list.filter((s) => s.risk === riskFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.admission_number.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allStudents, riskFilter, searchQuery]);

  const riskCounts = useMemo(() => {
    return {
      high: allStudents.filter((s) => s.risk === "high").length,
      medium: allStudents.filter((s) => s.risk === "medium").length,
      low: allStudents.filter((s) => s.risk === "low").length,
    };
  }, [allStudents]);

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

          {/* Two Column: Today's Schedule + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Schedule */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: GOLD }} />
                  <h2 className="text-sm font-medium text-white">Today's Schedule</h2>
                </div>
                <Link href="/teacher/timetables">
                  <span className="text-[11px] text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1">
                    Full Timetable <ChevronRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
              {todaySchedule.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No sessions scheduled for today</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/30">
                  {todaySchedule.map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.03 }}
                      className="p-4 flex items-center gap-4"
                    >
                      <div className="w-16 text-right shrink-0">
                        <p className="text-sm font-bold text-white">{entry.start_time.slice(0, 5)}</p>
                        <p className="text-[10px] text-slate-500">{entry.end_time.slice(0, 5)}</p>
                      </div>
                      <div className="w-px h-8 bg-slate-700/50" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{entry.subjects?.name || "Unknown Subject"}</p>
                        <p className="text-[10px] text-slate-500">{entry.room || "No room assigned"}</p>
                      </div>
                      {entry.topic && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] text-slate-400 bg-slate-800/50 border border-slate-700/30 truncate max-w-[150px]">
                          {entry.topic}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5"
            >
              <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
                Quick Actions
              </h2>
              <div className="space-y-2">
                <Link href="/teacher/registers">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-all group">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
                      <ClipboardCheck className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Take Attendance</p>
                      <p className="text-[10px] text-slate-500">Mark today's attendance</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
                <Link href="/teacher/marks">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-all group">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,175,55,0.12)" }}>
                      <Pencil className="w-4 h-4" style={{ color: GOLD }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Enter Grades</p>
                      <p className="text-[10px] text-slate-500">Record student marks</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
                <Link href="/teacher/assignments/create">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-all group">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)" }}>
                      <FileText className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Create Assignment</p>
                      <p className="text-[10px] text-slate-500">New task for students</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
                <Link href="/teacher/students">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-all group">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)" }}>
                      <Users className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">View All Students</p>
                      <p className="text-[10px] text-slate-500">Class roster & details</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Student List with Risk Filter */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-700/50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: GOLD }} />
                  <h2 className="text-sm font-medium text-white">Class Students</h2>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700/30">
                    {allStudents.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Risk filters */}
                  {([
                    { key: "all" as const, label: "All", count: allStudents.length, color: "#94a3b8" },
                    { key: "high" as const, label: "High Risk", count: riskCounts.high, color: "#ef4444" },
                    { key: "medium" as const, label: "Medium", count: riskCounts.medium, color: "#f59e0b" },
                    { key: "low" as const, label: "Low Risk", count: riskCounts.low, color: "#22c55e" },
                  ]).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setRiskFilter(f.key)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                        riskFilter === f.key
                          ? "text-slate-950"
                          : "text-slate-400 border-slate-700/30 hover:bg-slate-800/30"
                      }`}
                      style={
                        riskFilter === f.key
                          ? { background: f.color, borderColor: f.color }
                          : undefined
                      }
                    >
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {searchQuery ? "No students match your search" : "No students found"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-3 px-4 font-medium text-slate-400 text-[11px] uppercase tracking-wider">Student</th>
                      <th className="text-center py-3 px-3 font-medium text-slate-400 text-[11px] uppercase tracking-wider w-20">Grade</th>
                      <th className="text-center py-3 px-3 font-medium text-slate-400 text-[11px] uppercase tracking-wider w-20">Attend</th>
                      <th className="text-center py-3 px-3 font-medium text-slate-400 text-[11px] uppercase tracking-wider w-24">Risk</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-400 text-[11px] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {filteredStudents.map((s, i) => (
                      <motion.tr
                        key={s.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}
                            >
                              {s.name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{s.name}</p>
                              <p className="text-[10px] text-slate-500">{s.admission_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-sm font-bold" style={{ color: s.avg >= 60 ? "#22c55e" : s.avg >= 40 ? "#f59e0b" : "#ef4444" }}>
                            {s.avg}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-sm font-bold" style={{ color: s.attRate >= 75 ? "#22c55e" : s.attRate >= 50 ? "#f59e0b" : "#ef4444" }}>
                            {s.attRate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                              s.risk === "high"
                                ? "bg-red-500/15 text-red-400 border-red-500/30"
                                : s.risk === "medium"
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                : "bg-green-500/15 text-green-400 border-green-500/30"
                            }`}
                          >
                            {s.risk}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/teacher/students/${s.id}`}>
                              <button
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
                                title="View student"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Two Column: At-Risk + Subject Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* At-Risk Students */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
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
                      transition={{ delay: 0.4 + i * 0.03 }}
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
                      <Link href={`/teacher/students/${s.id}`}>
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Subject Performance */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
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
                      transition={{ delay: 0.45 + i * 0.03 }}
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
                          transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
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
