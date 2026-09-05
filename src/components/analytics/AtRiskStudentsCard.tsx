"use client";

import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, TrendingUp, Minus, ChevronRight } from "lucide-react";
import { AtRiskStudent } from "@/hooks/useJoyAnalytics";
import { cn } from "@/lib/utils";

interface AtRiskStudentsCardProps {
  students: AtRiskStudent[];
  onStudentClick?: (studentId: string) => void;
}

export function AtRiskStudentsCard({ students, onStudentClick }: AtRiskStudentsCardProps) {
  if (students.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 text-center">
        <TrendingUp className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white">All Students on Track</h3>
        <p className="text-slate-400 text-sm mt-1">No at-risk students detected. Great job!</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="text-sm font-semibold text-white">At-Risk Students</h3>
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
            {students.length}
          </span>
        </div>
      </div>
      <div className="divide-y divide-slate-700/30">
        {students.slice(0, 8).map((student, index) => (
          <motion.div
            key={student.studentId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="px-5 py-3 hover:bg-slate-800/40 transition-colors cursor-pointer group"
            onClick={() => onStudentClick?.(student.studentId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">{student.studentName}</span>
                  <span className="text-xs text-slate-500">{student.className}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className={cn(
                    "text-xs font-medium",
                    student.trend === "declining" && "text-red-400",
                    student.trend === "improving" && "text-emerald-400",
                    student.trend === "stable" && "text-slate-400"
                  )}>
                    {student.trend === "declining" && <TrendingDown className="w-3 h-3 inline mr-1" />}
                    {student.trend === "improving" && <TrendingUp className="w-3 h-3 inline mr-1" />}
                    {student.trend === "stable" && <Minus className="w-3 h-3 inline mr-1" />}
                    {student.currentAverage}% (was {student.previousAverage}%)
                  </span>
                  {student.weakSubjects.length > 0 && (
                    <span className="text-xs text-amber-400">
                      Weak: {student.weakSubjects.join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className={cn(
                    "text-sm font-bold",
                    student.riskScore >= 70 ? "text-red-400" :
                    student.riskScore >= 50 ? "text-amber-400" : "text-orange-400"
                  )}>
                    {student.riskScore}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">Risk</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[#D4AF37] transition-colors" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{student.recommendation}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
