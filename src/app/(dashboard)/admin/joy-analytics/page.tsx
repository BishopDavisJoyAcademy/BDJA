"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BarChart3, TrendingUp, TrendingDown, AlertTriangle, Users,
  GraduationCap, Calendar, Activity, Loader2, Filter, RefreshCw,
  ChevronDown, BookOpen, Clock, Award
} from "lucide-react";
import { useJoyAnalytics } from "@/hooks/useJoyAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function JoyAnalyticsPage() {
  const { user } = useAuth();
  const {
    gradeAnalytics, attendanceAnalytics, anomalies,
    loading, fetchGradeAnalytics, fetchAttendanceAnalytics, fetchAnomalies,
  } = useJoyAnalytics();

  const [activeTab, setActiveTab] = useState<"grades" | "attendance" | "anomalies">("grades");
  const [classFilter, setClassFilter] = useState<string>("");
  const [termFilter, setTermFilter] = useState<string>("Term 1");
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchGradeAnalytics({ class_id: classFilter || undefined, term: termFilter }),
        fetchAttendanceAnalytics({ class_id: classFilter || undefined }),
        fetchAnomalies(),
      ]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }, [fetchGradeAnalytics, fetchAttendanceAnalytics, fetchAnomalies, classFilter, termFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const statCards = [
    {
      label: "Total Assessments",
      value: gradeAnalytics?.overallStats.totalAssessments || 0,
      icon: BookOpen,
      color: "text-blue-400 bg-blue-400/10",
    },
    {
      label: "Average Score",
      value: gradeAnalytics?.overallStats.averageScore ? `${gradeAnalytics.overallStats.averageScore}%` : "N/A",
      icon: Award,
      color: "text-[#D4AF37] bg-[#D4AF37]/10",
    },
    {
      label: "Pass Rate",
      value: gradeAnalytics?.overallStats.passRate ? `${gradeAnalytics.overallStats.passRate}%` : "N/A",
      icon: TrendingUp,
      color: "text-emerald-400 bg-emerald-400/10",
    },
    {
      label: "At-Risk Students",
      value: gradeAnalytics?.overallStats.atRiskCount || 0,
      icon: AlertTriangle,
      color: "text-red-400 bg-red-400/10",
    },
    {
      label: "Attendance Rate",
      value: attendanceAnalytics?.summary.presentRate ? `${attendanceAnalytics.summary.presentRate}%` : "N/A",
      icon: Calendar,
      color: "text-cyan-400 bg-cyan-400/10",
    },
    {
      label: "Anomalies Detected",
      value: anomalies?.length || 0,
      icon: Activity,
      color: "text-rose-400 bg-rose-400/10",
    },
  ];

  const severityColor = (severity: string) => {
    const map: Record<string, string> = {
      critical: "text-red-400 bg-red-400/10 border-red-400/20",
      high: "text-orange-400 bg-orange-400/10 border-orange-400/20",
      medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
      low: "text-slate-400 bg-slate-400/10 border-slate-400/20",
    };
    return map[severity] || map.low;
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="w-7 h-7 text-[#D4AF37]" />
                Joy Analytics
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                AI-powered insights across grades, attendance, and anomalies
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
              <Button
                onClick={loadAll}
                disabled={refreshing}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700/60"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
        >
          {statCards.map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4"
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", stat.color.split(" ").slice(1).join(" "))}>
                <stat.icon className={cn("w-4 h-4", stat.color.split(" ")[0])} />
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700/50 pb-1">
          {[
            { key: "grades" as const, label: "Grade Insights", icon: GraduationCap },
            { key: "attendance" as const, label: "Attendance", icon: Calendar },
            { key: "anomalies" as const, label: "Anomalies", icon: AlertTriangle },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all border-b-2",
                activeTab === tab.key
                  ? "text-[#D4AF37] border-[#D4AF37] bg-[#D4AF37]/5"
                  : "text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-800/30"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "grades" && (
              <div className="space-y-6">
                {/* At-Risk Students */}
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    At-Risk Students
                  </h3>
                  {gradeAnalytics?.atRiskStudents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      No at-risk students detected. Great job!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {gradeAnalytics?.atRiskStudents.map((student) => (
                        <div
                          key={student.studentId}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/30"
                        >
                          <div>
                            <div className="text-sm font-medium text-white">{student.studentName}</div>
                            <div className="text-xs text-slate-500">{student.className}</div>
                            <div className="text-xs text-slate-400 mt-1">{student.recommendation}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-red-400">{student.riskScore}/100</div>
                            <div className="text-xs text-slate-500">Risk Score</div>
                            <div className={cn("text-xs mt-1", student.trend === "declining" ? "text-red-400" : student.trend === "improving" ? "text-emerald-400" : "text-slate-400")}>
                              {student.trend}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Class Averages */}
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#D4AF37]" />
                    Class Performance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gradeAnalytics?.classAverages.map((cls) => (
                      <div
                        key={cls.classId}
                        className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/30"
                      >
                        <div className="text-sm font-semibold text-white">{cls.className}</div>
                        <div className="flex items-center gap-4 mt-2">
                          <div>
                            <div className="text-lg font-bold text-[#D4AF37]">{cls.averageScore}%</div>
                            <div className="text-[10px] text-slate-500">Average</div>
                          </div>
                          <div className="text-xs text-slate-400">
                            <div>Top: {cls.topSubject}</div>
                            <div>Weak: {cls.weakestSubject}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="space-y-6">
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    Attendance Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {attendanceAnalytics && [
                      { label: "Total Records", value: attendanceAnalytics.summary.totalRecords, color: "text-white" },
                      { label: "Present Rate", value: `${attendanceAnalytics.summary.presentRate}%`, color: "text-emerald-400" },
                      { label: "Absent Rate", value: `${attendanceAnalytics.summary.absentRate}%`, color: "text-red-400" },
                      { label: "Late Rate", value: `${attendanceAnalytics.summary.lateRate}%`, color: "text-amber-400" },
                    ].map((s) => (
                      <div key={s.label} className="text-center p-4 rounded-xl bg-slate-800/40 border border-slate-700/30">
                        <div className={cn("text-xl font-bold", s.color)}>{s.value}</div>
                        <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Frequent Absentees */}
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    Frequent Absentees
                  </h3>
                  {attendanceAnalytics?.frequentAbsentees.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      No attendance concerns detected.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {attendanceAnalytics?.frequentAbsentees.map((s) => (
                        <div
                          key={s.studentId}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/30"
                        >
                          <div>
                            <div className="text-sm font-medium text-white">{s.studentName}</div>
                            <div className="text-xs text-slate-500">{s.className}</div>
                            <div className="text-xs text-slate-400 mt-1">{s.recommendation}</div>
                          </div>
                          <div className="text-right">
                            <div className={cn("text-sm font-bold", s.riskLevel === "high" ? "text-red-400" : s.riskLevel === "medium" ? "text-amber-400" : "text-emerald-400")}>
                              {s.attendanceRate}%
                            </div>
                            <div className="text-xs text-slate-500">Attendance</div>
                            <div className="text-xs text-slate-400">{s.absentCount} absences</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "anomalies" && (
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-400" />
                  Detected Anomalies
                </h3>
                {anomalies?.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No anomalies detected. Everything looks good!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {anomalies?.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30"
                      >
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border shrink-0 mt-0.5", severityColor(a.severity))}>
                          {a.severity}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{a.description}</div>
                          <div className="text-xs text-slate-400 mt-1">{a.details}</div>
                          <div className="text-xs text-[#D4AF37] mt-1">{a.recommendedAction}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
