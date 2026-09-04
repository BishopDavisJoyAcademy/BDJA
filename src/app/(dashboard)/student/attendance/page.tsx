"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  BookOpen,
  Loader2,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const GOLD = "#D4AF37";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  notes: string | null;
  class_id: string;
  subject_id: string | null;
  classes: { name: string | null; grade_level: string | null } | null;
}

interface DayCell {
  date: number;
  fullDate: string;
  records: AttendanceRecord[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

const statusConfig = {
  present: { label: "Present", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)", border: "rgba(34, 197, 94, 0.3)", icon: CheckCircle2 },
  absent: { label: "Absent", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)", icon: XCircle },
  late: { label: "Late", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)", icon: Clock },
  excused: { label: "Excused", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.3)", icon: AlertCircle },
};

export default function StudentAttendancePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch(`/api/attendance`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch attendance");
      }
      const data = await res.json();
      setRecords(data.attendance || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load attendance");
      toast.error(getErrorMessage(err) || "Could not load attendance");
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const calendarDays: DayCell[] = [];

  // Empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ date: 0, fullDate: "", records: [], isToday: false, isCurrentMonth: false });
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const fullDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayRecords = records.filter((r) => r.date === fullDate);
    calendarDays.push({
      date: day,
      fullDate,
      records: dayRecords,
      isToday: fullDate === todayStr,
      isCurrentMonth: true,
    });
  }

  // Stats
  const stats = {
    total: records.length,
    present: records.filter((r) => r.status === "present").length,
    absent: records.filter((r) => r.status === "absent").length,
    late: records.filter((r) => r.status === "late").length,
    excused: records.filter((r) => r.status === "excused").length,
  };
  const presentRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedRecords = selectedDate
    ? records.filter((r) => r.date === selectedDate)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
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
        <button
          onClick={fetchAttendance}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: `${GOLD}15`, color: GOLD }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold text-white">Attendance</h1>
          <p className="text-sm text-slate-400 mt-1">Track your daily attendance record</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm font-medium text-white min-w-[140px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        {[
          { label: "Total Days", value: stats.total, color: GOLD, icon: CalendarIcon },
          { label: "Present", value: stats.present, color: "#22c55e", icon: CheckCircle2 },
          { label: "Absent", value: stats.absent, color: "#ef4444", icon: XCircle },
          { label: "Late", value: stats.late, color: "#f59e0b", icon: Clock },
          { label: "Excused", value: stats.excused, color: "#3b82f6", icon: AlertCircle },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.03 }}
            className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Present Rate Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: GOLD }} />
            <span className="text-sm font-medium text-white">Attendance Rate</span>
          </div>
          <span className="text-lg font-bold" style={{ color: GOLD }}>
            {presentRate}%
          </span>
        </div>
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${presentRate}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: GOLD }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {stats.present} out of {stats.total} days marked present
        </p>
      </motion.div>

      {/* Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5"
      >
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-[11px] font-medium uppercase tracking-wider text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (!day.isCurrentMonth) {
              return <div key={idx} className="aspect-square rounded-xl" />;
            }

            const primaryStatus = day.records[0]?.status as keyof typeof statusConfig | undefined;
            const config = primaryStatus ? statusConfig[primaryStatus] : null;
            const hasMultiple = day.records.length > 1;

            return (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDate(day.fullDate)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 relative transition-all ${
                  day.isToday
                    ? "ring-2"
                    : ""
                }`}
                style={{
                  background: config ? config.bg : "rgba(30, 41, 59, 0.5)",
                  border: `1px solid ${config ? config.border : "rgba(51, 65, 85, 0.3)"}`,
                  boxShadow: day.isToday ? `0 0 0 2px ${GOLD}` : undefined,
                }}
              >
                <span
                  className={`text-sm font-medium ${
                    day.isToday ? "text-white" : "text-slate-300"
                  }`}
                >
                  {day.date}
                </span>
                {config && (
                  <config.icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                )}
                {hasMultiple && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-700/30">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <cfg.icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
              <span className="text-xs text-slate-400">{cfg.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full" style={{ background: GOLD }} />
            <span className="text-xs text-slate-400">Today</span>
          </div>
        </div>
      </motion.div>

      {/* Selected Date Detail */}
      <AnimatePresence>
        {selectedDate && selectedRecords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs text-slate-500 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
            {selectedRecords.map((record) => {
              const cfg = statusConfig[record.status];
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                >
                  <cfg.icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                      {record.classes?.name && (
                        <span className="text-xs text-slate-500">{record.classes.name}</span>
                      )}
                    </div>
                    {record.notes && (
                      <p className="text-xs text-slate-400 mt-1">{record.notes}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {records.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-slate-900/60 border border-slate-700/50 rounded-2xl"
        >
          <CalendarIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No attendance records for {monthNames[month]} {year}</p>
        </motion.div>
      )}
    </div>
  );
}
