"use client";

import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, ShieldAlert, Bug, Eye, CheckCircle } from "lucide-react";
import { Anomaly } from "@/hooks/useJoyAnalytics";
import { cn } from "@/lib/utils";

interface AnomaliesCardProps {
  anomalies: Anomaly[];
}

const typeIcons: Record<string, typeof AlertCircle> = {
  grade_drop: TrendingDown,
  grade_jump: TrendingUp,
  attendance_spike: UserX,
  data_error: Bug,
  unusual_pattern: Eye,
};

import { TrendingDown, TrendingUp, UserX } from "lucide-react";

const severityColors: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  low: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

export function AnomaliesCard({ anomalies }: AnomaliesCardProps) {
  if (anomalies.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 text-center">
        <ShieldAlert className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white">No Anomalies Detected</h3>
        <p className="text-slate-400 text-sm mt-1">All data looks healthy. Keep monitoring.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Anomalies Detected</h3>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
            {anomalies.length}
          </span>
        </div>
      </div>
      <div className="divide-y divide-slate-700/30 max-h-[500px] overflow-y-auto">
        {anomalies.map((anomaly, index) => {
          const Icon = typeIcons[anomaly.type] || AlertCircle;
          return (
            <motion.div
              key={anomaly.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="px-5 py-3 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg shrink-0", severityColors[anomaly.severity])}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{anomaly.description}</span>
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase", severityColors[anomaly.severity])}>
                      {anomaly.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{anomaly.details}</p>
                  <p className="text-xs text-[#D4AF37] mt-1.5">
                    <span className="font-medium">Action:</span> {anomaly.recommendedAction}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-600">{anomaly.studentName}</span>
                    <span className="text-[10px] text-slate-600">{anomaly.className}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
