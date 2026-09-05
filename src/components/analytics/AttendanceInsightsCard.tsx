"use client";

import { motion } from "framer-motion";
import { UserCheck, UserX, Clock, AlertCircle, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { AttendanceAnalytics } from "@/hooks/useJoyAnalytics";
import { cn } from "@/lib/utils";

interface AttendanceInsightsCardProps {
  analytics: AttendanceAnalytics;
}

export function AttendanceInsightsCard({ analytics }: AttendanceInsightsCardProps) {
  const { summary, frequentAbsentees, classAttendance } = analytics;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Present", value: summary.presentRate, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-400/10" },
          { label: "Absent", value: summary.absentRate, icon: UserX, color: "text-red-400", bg: "bg-red-400/10" },
          { label: "Late", value: summary.lateRate, icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
          { label: "Excused", value: summary.excusedRate, icon: AlertCircle, color: "text-blue-400", bg: "bg-blue-400/10" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("p-1.5 rounded-lg", stat.bg)}>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
              <span className="text-xs text-slate-400">{stat.label}</span>
            </div>
            <div className={cn("text-2xl font-bold", stat.color)}>{stat.value}%</div>
          </motion.div>
        ))}
      </div>

      {/* Frequent Absentees */}
      {frequentAbsentees.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/50">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Frequent Absentees ({frequentAbsentees.length})
            </h4>
          </div>
          <div className="divide-y divide-slate-700/30">
            {frequentAbsentees.slice(0, 5).map((student, index) => (
              <motion.div
                key={student.studentId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="px-5 py-2.5 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm text-white">{student.studentName}</span>
                  <span className="text-xs text-slate-500 ml-2">{student.className}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-xs font-medium",
                    student.trend === "declining" && "text-red-400",
                    student.trend === "improving" && "text-emerald-400",
                    student.trend === "stable" && "text-slate-400"
                  )}>
                    {student.trend === "declining" && <TrendingDown className="w-3 h-3 inline mr-1" />}
                    {student.trend === "improving" && <TrendingUp className="w-3 h-3 inline mr-1" />}
                    {student.trend === "stable" && <Minus className="w-3 h-3 inline mr-1" />}
                    {student.attendanceRate}%
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold",
                    student.riskLevel === "high" && "bg-red-500/10 text-red-400",
                    student.riskLevel === "medium" && "bg-amber-500/10 text-amber-400",
                    student.riskLevel === "low" && "bg-emerald-500/10 text-emerald-400"
                  )}>
                    {student.riskLevel}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Class Breakdown */}
      {classAttendance.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/50">
            <h4 className="text-sm font-semibold text-white">Class Attendance Breakdown</h4>
          </div>
          <div className="divide-y divide-slate-700/30">
            {classAttendance.map((cls, index) => (
              <motion.div
                key={cls.classId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="px-5 py-2.5"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-white">{cls.className}</span>
                  <span className="text-xs text-slate-500">{cls.studentCount} students</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                  <div className="bg-emerald-400" style={{ width: `${cls.presentRate}%` }} />
                  <div className="bg-red-400" style={{ width: `${cls.absentRate}%` }} />
                  <div className="bg-amber-400" style={{ width: `${cls.lateRate}%` }} />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                  <span className="text-emerald-400">{cls.presentRate}% present</span>
                  <span className="text-red-400">{cls.absentRate}% absent</span>
                  <span className="text-amber-400">{cls.lateRate}% late</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
