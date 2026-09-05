"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BarChart3, Brain, GraduationCap, UserCheck, AlertTriangle,
  RefreshCw, Loader2, Sparkles, Filter, ChevronDown
} from "lucide-react";
import { useJoyAnalytics } from "@/hooks/useJoyAnalytics";
import { AtRiskStudentsCard } from "@/components/analytics/AtRiskStudentsCard";
import { AttendanceInsightsCard } from "@/components/analytics/AttendanceInsightsCard";
import { AnomaliesCard } from "@/components/analytics/AnomaliesCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "grades", label: "Grade Insights", icon: GraduationCap },
  { key: "attendance", label: "Attendance", icon: UserCheck },
  { key: "anomalies", label: "Anomalies", icon: AlertTriangle },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function JoyAnalyticsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    gradeAnalytics,
    attendanceAnalytics,
    anomalies,
    loading,
    fetchGradeAnalytics,
    fetchAttendanceAnalytics,
    fetchAnomalies,
  } = useJoyAnalytics();

  const loadAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchGradeAnalytics(),
      fetchAttendanceAnalytics(),
      fetchAnomalies(),
    ]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    toast.info("Refreshing analytics data...");
    loadAll();
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Brain className="w-7 h-7 text-[#D4AF37]" />
                Joy Analytics
                <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-semibold border border-[#D4AF37]/20">
                  AI-Powered
                </span>
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                AI-generated insights on grades, attendance, and data anomalies
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="border-slate-700/50 text-slate-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/30"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Analyzing..." : "Refresh Insights"}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab.key
                  ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.key === "anomalies" && anomalies.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                  {anomalies.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {loading && !gradeAnalytics && !attendanceAnalytics && anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin mb-4" />
            <p className="text-slate-400 text-sm">Joy is analyzing your data...</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            key={activeTab}
          >
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overall Stats */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      {
                        label: "Avg Grade",
                        value: gradeAnalytics?.overallStats.averageScore ?? "—",
                        suffix: "%",
                        icon: GraduationCap,
                        color: "text-[#D4AF37]",
                        bg: "bg-[#D4AF37]/10",
                      },
                      {
                        label: "Pass Rate",
                        value: gradeAnalytics?.overallStats.passRate ?? "—",
                        suffix: "%",
                        icon: Sparkles,
                        color: "text-emerald-400",
                        bg: "bg-emerald-400/10",
                      },
                      {
                        label: "At Risk",
                        value: gradeAnalytics?.overallStats.atRiskCount ?? "—",
                        suffix: " students",
                        icon: AlertTriangle,
                        color: "text-red-400",
                        bg: "bg-red-400/10",
                      },
                      {
                        label: "Attendance",
                        value: attendanceAnalytics?.summary.presentRate ?? "—",
                        suffix: "%",
                        icon: UserCheck,
                        color: "text-blue-400",
                        bg: "bg-blue-400/10",
                      },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        variants={itemVariants}
                        className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className={cn("p-2 rounded-lg", stat.bg)}>
                            <stat.icon className={cn("w-4 h-4", stat.color)} />
                          </div>
                          <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
                        </div>
                        <div className={cn("text-3xl font-bold", stat.color)}>
                          {stat.value}
                          <span className="text-sm font-normal text-slate-500 ml-1">{stat.suffix}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* At-Risk Preview */}
                <motion.div variants={itemVariants}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">At-Risk Students</h3>
                    <button
                      onClick={() => setActiveTab("grades")}
                      className="text-xs text-[#D4AF37] hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <AtRiskStudentsCard students={gradeAnalytics?.atRiskStudents ?? []} />
                </motion.div>

                {/* Anomalies Preview */}
                <motion.div variants={itemVariants}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">Recent Anomalies</h3>
                    <button
                      onClick={() => setActiveTab("anomalies")}
                      className="text-xs text-[#D4AF37] hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <AnomaliesCard anomalies={anomalies.slice(0, 5)} />
                </motion.div>
              </div>
            )}

            {/* GRADES TAB */}
            {activeTab === "grades" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-2">
                  <h3 className="text-sm font-semibold text-white mb-3">At-Risk Students</h3>
                  <AtRiskStudentsCard students={gradeAnalytics?.atRiskStudents ?? []} />
                </motion.div>
                <motion.div variants={itemVariants} className="space-y-6">
                  {/* Class Averages */}
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3">Class Performance</h3>
                    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                      {(gradeAnalytics?.classAverages ?? []).map((cls, i) => (
                        <motion.div
                          key={cls.classId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="px-5 py-3 border-b border-slate-700/30 last:border-0"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-white">{cls.className}</span>
                            <span className={cn(
                              "text-sm font-bold",
                              cls.averageScore >= 70 ? "text-emerald-400" :
                              cls.averageScore >= 50 ? "text-amber-400" : "text-red-400"
                            )}>
                              {cls.averageScore}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${cls.averageScore}%` }}
                              transition={{ duration: 0.8, delay: i * 0.1 }}
                              className={cn(
                                "h-full rounded-full",
                                cls.averageScore >= 70 ? "bg-emerald-400" :
                                cls.averageScore >= 50 ? "bg-amber-400" : "bg-red-400"
                              )}
                            />
                          </div>
                          <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
                            <span>Top: <span className="text-emerald-400">{cls.topSubject}</span></span>
                            <span>Weak: <span className="text-red-400">{cls.weakestSubject}</span></span>
                          </div>
                        </motion.div>
                      ))}
                      {(gradeAnalytics?.classAverages ?? []).length === 0 && (
                        <div className="px-5 py-8 text-center text-slate-500 text-sm">
                          No class data available
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subject Performance */}
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3">Subject Performance</h3>
                    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                      {(gradeAnalytics?.subjectPerformance ?? []).map((subj, i) => (
                        <motion.div
                          key={subj.subjectId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="px-5 py-3 border-b border-slate-700/30 last:border-0"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-white">{subj.subjectName}</span>
                            <span className="text-sm font-bold text-[#D4AF37]">{subj.averageScore}%</span>
                          </div>
                          <div className="text-xs text-slate-500">{subj.studentCount} assessments</div>
                        </motion.div>
                      ))}
                      {(gradeAnalytics?.subjectPerformance ?? []).length === 0 && (
                        <div className="px-5 py-8 text-center text-slate-500 text-sm">
                          No subject data available
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === "attendance" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-2">
                  {attendanceAnalytics && (
                    <AttendanceInsightsCard analytics={attendanceAnalytics} />
                  )}
                </motion.div>
                <motion.div variants={itemVariants}>
                  <h3 className="text-sm font-semibold text-white mb-3">Grade Correlation</h3>
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                    {(attendanceAnalytics?.gradeCorrelation ?? []).map((corr, i) => (
                      <motion.div
                        key={corr.studentId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="px-5 py-3 border-b border-slate-700/30 last:border-0"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white">{corr.studentName}</span>
                          <span className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded",
                            corr.correlation === "positive" && "bg-emerald-500/10 text-emerald-400",
                            corr.correlation === "negative" && "bg-red-500/10 text-red-400",
                            corr.correlation === "neutral" && "bg-slate-500/10 text-slate-400"
                          )}>
                            {corr.correlation}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Attendance: {corr.attendanceRate}%</span>
                          <span>Grade: {corr.averageGrade}%</span>
                        </div>
                      </motion.div>
                    ))}
                    {(attendanceAnalytics?.gradeCorrelation ?? []).length === 0 && (
                      <div className="px-5 py-8 text-center text-slate-500 text-sm">
                        No correlation data available
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            {/* ANOMALIES TAB */}
            {activeTab === "anomalies" && (
              <motion.div variants={itemVariants}>
                <AnomaliesCard anomalies={anomalies} />
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
