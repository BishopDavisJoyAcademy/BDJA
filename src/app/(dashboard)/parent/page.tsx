"use client";

import { useParentContext } from "@/contexts/ParentContext";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import {
  Award, UserCheck, BookOpen, Wallet, MessageSquare, Calendar, Megaphone, Clock, Baby,
  ArrowRight, Loader2, TrendingUp, TrendingDown, AlertTriangle
} from "lucide-react";

const GOLD = "#D4AF37";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const cardAnim = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };

interface DashboardStats {
  avgGrade: number | null;
  attendanceRate: number | null;
  pendingAssignments: number;
  unreadMessages: number;
  balance: number | null;
}

export default function ParentDashboard() {
  const { selectedChild, children, loading: ctxLoading } = useParentContext();
  const [stats, setStats] = useState<DashboardStats>({ avgGrade: null, attendanceRate: null, pendingAssignments: 0, unreadMessages: 0, balance: null });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!selectedChild) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const [gradesRes, attRes, assignRes, msgRes, feeRes] = await Promise.all([
        fetch(`/api/parent/grades?child_id=${selectedChild.student_id}`, { headers }),
        fetch(`/api/parent/attendance?child_id=${selectedChild.student_id}&start_date=${new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]}`, { headers }),
        fetch(`/api/parent/assignments?child_id=${selectedChild.student_id}`, { headers }),
        fetch(`/api/parent/messages?child_id=${selectedChild.student_id}`, { headers }),
        fetch(`/api/parent/fees?child_id=${selectedChild.student_id}`, { headers }),
      ]);

      let avgGrade: number | null = null;
      if (gradesRes.ok) {
        const gData = await gradesRes.json();
        const grades = gData.grades || [];
        if (grades.length > 0) {
          const total = grades.reduce((sum: number, g: Record<string, unknown>) => sum + (((g.score as number) || 0) / ((g.max_score as number) || 100)) * 100, 0);
          avgGrade = Math.round(total / grades.length);
        }
      }

      let attRate: number | null = null;
      if (attRes.ok) {
        const aData = await attRes.json();
        const st = aData.stats;
        if (st && st.total > 0) attRate = Math.round((st.present / st.total) * 100);
      }

      let pending = 0;
      if (assignRes.ok) {
        const asData = await assignRes.json();
        pending = (asData.assignments || []).filter((a: Record<string, unknown>) => a.submission_status !== "submitted").length;
      }

      let unread = 0;
      if (msgRes.ok) {
        const mData = await msgRes.json();
        unread = (mData.messages || []).filter((m: Record<string, unknown>) => m.sent_by === "teacher" && !m.read_by_parent).length;
      }

      let balance: number | null = null;
      if (feeRes.ok) {
        const fData = await feeRes.json();
        balance = fData.balance ?? null;
      }

      setStats({ avgGrade, attendanceRate: attRate, pendingAssignments: pending, unreadMessages: unread, balance });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const quickLinks = [
    { label: "Grades", href: "/parent/grades", icon: Award, value: stats.avgGrade !== null ? `${stats.avgGrade}%` : "—", color: "#D4AF37" },
    { label: "Attendance", href: "/parent/attendance", icon: UserCheck, value: stats.attendanceRate !== null ? `${stats.attendanceRate}%` : "—", color: "#22c55e" },
    { label: "Assignments", href: "/parent/assignments", icon: BookOpen, value: stats.pendingAssignments > 0 ? `${stats.pendingAssignments} pending` : "All caught up", color: "#a855f7" },
    { label: "Fees", href: "/parent/fees", icon: Wallet, value: stats.balance !== null ? `KES ${stats.balance.toLocaleString()}` : "—", color: "#ef4444" },
  ];

  if (ctxLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Baby className="w-16 h-16 text-slate-700 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">No Children Linked</h2>
        <p className="text-slate-400 text-sm max-w-sm">Your account is not linked to any students yet. Please contact the school administration.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Parent Dashboard</h1>
        <p className="text-slate-400 mt-1">
          {selectedChild ? `Viewing ${selectedChild.full_name}'s information` : "Select a child to view their details"}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <motion.div key={link.label} variants={cardAnim}>
              <Link href={link.href} className="group block h-full rounded-2xl bg-slate-900/60 border border-slate-700/50 hover:border-slate-600/50 p-5 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${link.color}15`, border: `1px solid ${link.color}25` }}>
                    <Icon className="w-5 h-5" style={{ color: link.color }} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-2xl font-bold text-white">{link.value}</p>
                <p className="text-xs text-slate-500 mt-1">{link.label}</p>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Alerts */}
      {stats.pendingAssignments > 3 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-amber-500/5 border border-amber-500/15 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-200">{stats.pendingAssignments} assignments pending</p>
            <p className="text-xs text-amber-300/60">Check the assignments page for details</p>
          </div>
        </motion.div>
      )}

      {stats.balance !== null && stats.balance > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-red-500/5 border border-red-500/15 p-4 flex items-center gap-3">
          <TrendingDown className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-200">Outstanding balance: KES {stats.balance.toLocaleString()}</p>
            <p className="text-xs text-red-300/60">Please make a payment via M-Pesa PayBill 100400</p>
          </div>
          <Link href="/parent/fees" className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors">Pay Now</Link>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Message Teacher", href: "/parent/messages", icon: MessageSquare, desc: "Communicate directly" },
          { label: "School Calendar", href: "/parent/calendar", icon: Calendar, desc: "Events & holidays" },
          { label: "Announcements", href: "/parent/announcements", icon: Megaphone, desc: "School updates" },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <motion.div key={action.label} variants={cardAnim}>
              <Link href={action.href} className="group flex items-center gap-4 rounded-2xl bg-slate-900/40 border border-slate-700/30 hover:border-[#D4AF37]/20 p-4 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#D4AF3710", border: "1px solid #D4AF3720" }}>
                  <Icon className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors">{action.label}</p>
                  <p className="text-xs text-slate-500">{action.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-[#D4AF37] transition-colors shrink-0" />
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
