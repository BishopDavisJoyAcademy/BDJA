"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, Mail, Phone, MapPin, Calendar, GraduationCap,
  Award, TrendingUp, Clock, BookOpen, CheckCircle2, XCircle,
  AlertCircle, Loader2, FileText, BarChart3, Activity,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const GOLD = "#D4AF37";

interface StudentData {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  phone: string;
  date_of_birth: string | null;
  gender: string;
  address: string;
  admission_number: string;
  class_name: string;
  grade_level: string;
  status: string;
  class_teacher: string;
}

interface GradeItem {
  id: string;
  subject_name: string;
  strand: string;
  sub_strand: string;
  score: number | null;
  max_score: number | null;
  performance_level: string;
  term: string;
  academic_year: string;
}

interface TermSummary {
  term_key: string;
  academic_year: string;
  term: string;
  average: number;
  grade_count: number;
  grades: GradeItem[];
}

interface AttendanceRecord {
  date: string;
  status: string;
  notes: string | null;
}

interface Submission {
  id: string;
  assignment_id: string;
  submitted_at: string;
  status: string;
  content: string | null;
  assignments: {
    title: string;
    due_date: string;
    subjects: { name: string } | null;
  } | null;
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  present: { color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)", label: "Present" },
  absent: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", label: "Absent" },
  late: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", label: "Late" },
  excused: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", label: "Excused" },
};

const performanceConfig: Record<string, { color: string; label: string }> = {
  excellent: { color: "#22c55e", label: "Excellent" },
  good: { color: "#3b82f6", label: "Good" },
  average: { color: "#f59e0b", label: "Average" },
  below_average: { color: "#f97316", label: "Below Avg" },
  poor: { color: "#ef4444", label: "Poor" },
};

export default function TeacherStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [student, setStudent] = useState<StudentData | null>(null);
  const [termSummaries, setTermSummaries] = useState<TermSummary[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, absent: 0, late: 0, excused: 0 });
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "grades" | "attendance" | "assignments">("overview");

  useEffect(() => {
    params.then((p) => setStudentId(p.id));
  }, [params]);

  const fetchData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError("");
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch(`/api/teacher/students/${studentId}`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch student data");
      }
      const data = await res.json();
      setStudent(data.student);
      setTermSummaries(data.term_summaries || []);
      setAttendanceStats(data.attendance?.stats || { total: 0, present: 0, absent: 0, late: 0, excused: 0 });
      setRecentAttendance(data.attendance?.recent || []);
      setSubmissions(data.submissions || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load student data");
      toast.error(getErrorMessage(err) || "Could not load student data");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const overallAvg = termSummaries.length > 0
    ? Math.round(termSummaries.reduce((s, t) => s + t.average, 0) / termSummaries.length)
    : 0;

  const attRate = attendanceStats.total > 0
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
    : 0;

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
        <button onClick={fetchData} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: `${GOLD}15`, color: GOLD }}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <button
          onClick={() => router.push("/teacher/students")}
          className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-white">{student?.name}</h1>
          <p className="text-sm text-slate-400">{student?.admission_number} · {student?.class_name}</p>
        </div>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5"
      >
        <div className="flex flex-col md:flex-row items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-2xl font-bold" style={{ color: GOLD }}>
            {student?.name?.charAt(0) || "?"}
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-300">{student?.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-300">{student?.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-300">{student?.grade_level || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-300">{student?.gender || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-300">
                {student?.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-300">{student?.address || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-300">Class Teacher: {student?.class_teacher || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: student?.status === "active" ? "#22c55e" : "#ef4444" }} />
              <span className="text-sm text-slate-300 capitalize">{student?.status || "—"}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {[
          { label: "Overall Average", value: `${overallAvg}%`, color: overallAvg >= 60 ? "#22c55e" : overallAvg >= 40 ? "#f59e0b" : "#ef4444", icon: TrendingUp },
          { label: "Attendance Rate", value: `${attRate}%`, color: attRate >= 75 ? "#22c55e" : attRate >= 50 ? "#f59e0b" : "#ef4444", icon: Clock },
          { label: "Terms Graded", value: termSummaries.length, color: GOLD, icon: BarChart3 },
          { label: "Submissions", value: submissions.length, color: "#3b82f6", icon: FileText },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.03 }}
            className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{s.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700/50 pb-1">
        {(["overview", "grades", "attendance", "assignments"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-all rounded-t-xl ${
              activeTab === tab
                ? "text-white border-b-2"
                : "text-slate-400 hover:text-slate-300"
            }`}
            style={activeTab === tab ? { borderColor: GOLD } : {}}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Recent Grades */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Award className="w-4 h-4" style={{ color: GOLD }} />
                Recent Grades
              </h3>
              {termSummaries.length === 0 ? (
                <p className="text-sm text-slate-500">No grade records</p>
              ) : (
                <div className="space-y-2">
                  {termSummaries.slice(0, 2).flatMap((t) => t.grades.slice(0, 3)).map((g) => {
                    const cfg = performanceConfig[g.performance_level] || performanceConfig.average;
                    return (
                      <div key={g.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30">
                        <div>
                          <p className="text-sm text-white">{g.subject_name}</p>
                          <p className="text-xs text-slate-500">{g.strand} · {g.sub_strand}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold" style={{ color: cfg.color }}>
                            {g.score ?? "—"}{g.max_score ? `/${g.max_score}` : ""}
                          </span>
                          <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: `${cfg.color}15`, color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Recent Attendance */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: GOLD }} />
                Recent Attendance (Last 30 Days)
              </h3>
              {recentAttendance.length === 0 ? (
                <p className="text-sm text-slate-500">No attendance records</p>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {recentAttendance.slice(0, 14).map((a) => {
                    const cfg = statusConfig[a.status] || statusConfig.present;
                    return (
                      <div
                        key={a.date}
                        className="aspect-square rounded-lg flex items-center justify-center"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
                        title={`${a.date}: ${cfg.label}${a.notes ? ` — ${a.notes}` : ""}`}
                      >
                        <span className="text-[10px] font-bold" style={{ color: cfg.color }}>
                          {new Date(a.date).getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {activeTab === "grades" && (
          <div className="space-y-4">
            {termSummaries.map((term) => (
              <motion.div
                key={term.term_key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
              >
                <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" style={{ color: GOLD }} />
                    <span className="text-sm font-medium text-white">{term.term_key}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{term.grade_count} assessments</span>
                    <span className="text-sm font-bold" style={{ color: term.average >= 60 ? "#22c55e" : term.average >= 40 ? "#f59e0b" : "#ef4444" }}>
                      {term.average}%
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {term.grades.map((g) => {
                    const cfg = performanceConfig[g.performance_level] || performanceConfig.average;
                    return (
                      <div key={g.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white">{g.subject_name}</p>
                          <p className="text-xs text-slate-500">{g.strand} · {g.sub_strand}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-300">
                            {g.score ?? "—"}{g.max_score ? ` / ${g.max_score}` : ""}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: `${cfg.color}15`, color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
            {termSummaries.length === 0 && (
              <div className="text-center py-12 bg-slate-900/60 border border-slate-700/50 rounded-2xl">
                <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No grade records found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-4 gap-3">
              {[
                { label: "Total", value: attendanceStats.total, color: "#64748b" },
                { label: "Present", value: attendanceStats.present, color: "#22c55e" },
                { label: "Absent", value: attendanceStats.absent, color: "#ef4444" },
                { label: "Late", value: attendanceStats.late, color: "#f59e0b" },
              ].map((s) => (
                <div key={s.label} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">{s.label}</p>
                </div>
              ))}
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-sm font-medium text-white mb-3">Attendance History</h3>
              <div className="space-y-2">
                {recentAttendance.map((a) => {
                  const cfg = statusConfig[a.status] || statusConfig.present;
                  return (
                    <div key={a.date} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                      <span className="text-sm text-slate-300 w-28">{new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                      {a.notes && <span className="text-xs text-slate-500">{a.notes}</span>}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="space-y-3">
            {submissions.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{sub.assignments?.title || "Unknown Assignment"}</p>
                    <p className="text-xs text-slate-500">
                      {sub.assignments?.subjects?.name || ""}
                      {sub.assignments?.due_date && ` · Due ${new Date(sub.assignments.due_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase"
                    style={{
                      background: sub.status === "graded" ? "rgba(34, 197, 94, 0.15)" : sub.status === "submitted" ? "rgba(59, 130, 246, 0.15)" : "rgba(245, 158, 11, 0.15)",
                      color: sub.status === "graded" ? "#22c55e" : sub.status === "submitted" ? "#3b82f6" : "#f59e0b",
                    }}
                  >
                    {sub.status}
                  </span>
                </div>
                {sub.content && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{sub.content}</p>
                )}
              </motion.div>
            ))}
            {submissions.length === 0 && (
              <div className="text-center py-12 bg-slate-900/60 border border-slate-700/50 rounded-2xl">
                <FileText className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No submissions found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
