"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, BookOpen, ClipboardCheck, Award,
  BarChart3, Clock, FileText, TrendingUp, AlertTriangle,
  Loader2, AlertCircle, ChevronRight, GraduationCap,
  Calendar, MessageSquare, Video,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import Link from "next/link";

const GOLD = "#D4AF37";

interface QuickStat {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: typeof Users;
  color: string;
  href: string;
}

interface RecentActivity {
  id: string;
  type: "submission" | "grade" | "attendance" | "message";
  title: string;
  student: string;
  time: string;
}

export default function TeacherDashboardPage() {
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      // Fetch teacher classes
      const classesRes = await fetch("/api/teacher/classes", { headers });
      const classesData = classesRes.ok ? await classesRes.json() : { classes: [] };
      const classIds = classesData.classes?.map((c: { id: string }) => c.id) || [];

      // Fetch assignments count
      const assignmentsRes = await fetch("/api/assignments", { headers });
      const assignmentsData = assignmentsRes.ok ? await assignmentsRes.json() : { assignments: [] };
      const myAssignments = assignmentsData.assignments?.filter((a: { teacher_id: string }) => a.teacher_id === s?.user?.id) || [];

      // Fetch submissions for my assignments
      let pendingSubmissions = 0;
      if (myAssignments.length > 0) {
        const assignmentIds = myAssignments.map((a: { id: string }) => a.id);
        const { data: subs } = await supabase
          .from("assignment_submissions")
          .select("id, status")
          .in("assignment_id", assignmentIds)
          .eq("status", "submitted");
        pendingSubmissions = subs?.length || 0;
      }

      // Fetch today's attendance
      const today = new Date().toISOString().split("T")[0];
      const { data: todayAttendance } = await supabase
        .from("attendance")
        .select("id")
        .in("class_id", classIds)
        .eq("date", today);

      const quickStats: QuickStat[] = [
        {
          label: "My Classes",
          value: classesData.classes?.length || 0,
          icon: GraduationCap,
          color: GOLD,
          href: "/teacher/class-dashboard",
        },
        {
          label: "Assignments",
          value: myAssignments.length,
          icon: FileText,
          color: "#3b82f6",
          href: "/teacher/assignments",
        },
        {
          label: "Pending Grading",
          value: pendingSubmissions,
          icon: Award,
          color: "#f59e0b",
          href: "/teacher/assignments",
        },
        {
          label: "Attendance Today",
          value: todayAttendance?.length || 0,
          icon: ClipboardCheck,
          color: "#22c55e",
          href: "/teacher/registers",
        },
      ];
      setStats(quickStats);

      // Build recent activity
      const recentSubs = myAssignments.slice(0, 3).map((a: { id: string; title: string }) => ({
        id: a.id,
        type: "submission" as const,
        title: a.title,
        student: "New submission",
        time: "Recently",
      }));
      setActivities(recentSubs);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load dashboard");
      toast.error(getErrorMessage(err) || "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const quickActions = [
    { label: "Take Attendance", icon: ClipboardCheck, href: "/teacher/registers", color: "#22c55e" },
    { label: "Create Assignment", icon: FileText, href: "/teacher/assignments", color: "#3b82f6" },
    { label: "Enter Grades", icon: Award, href: "/teacher/marks", color: GOLD },
    { label: "VORA Content", icon: Video, href: "/teacher/vora", color: "#a855f7" },
  ];

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
        <button onClick={fetchDashboard} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: `${GOLD}15`, color: GOLD }}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold text-white">Teacher Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your classes, assignments, and student progress</p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.03 }}
          >
            <Link href={s.href} className="block bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 hover:border-slate-600/50 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mt-1">{s.label}</p>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-sm font-medium text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.03 }}
            >
              <Link
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl hover:border-slate-600/50 transition-all text-center"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${action.color}15` }}>
                  <action.icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <span className="text-xs font-medium text-slate-300">{action.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5"
        >
          <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: GOLD }} />
            Recent Activity
          </h2>
          {activities.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <div className="flex-1">
                    <p className="text-sm text-white">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.student}</p>
                  </div>
                  <span className="text-[10px] text-slate-500">{a.time}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* At-Risk Alert */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5"
        >
          <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Attention Needed
          </h2>
          <div className="space-y-3">
            <Link href="/teacher/class-dashboard" className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-all">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm text-white">Check Class Dashboard</p>
                <p className="text-xs text-slate-500">Monitor at-risk students and subject performance</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </Link>
            <Link href="/teacher/assignments" className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-all">
              <Award className="w-5 h-5 text-blue-400" />
              <div className="flex-1">
                <p className="text-sm text-white">Grade Pending Submissions</p>
                <p className="text-xs text-slate-500">Review and grade student assignment submissions</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </Link>
            <Link href="/teacher/registers" className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-all">
              <ClipboardCheck className="w-5 h-5 text-green-400" />
              <div className="flex-1">
                <p className="text-sm text-white">Take Attendance</p>
                <p className="text-xs text-slate-500">Mark daily attendance for your classes</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
