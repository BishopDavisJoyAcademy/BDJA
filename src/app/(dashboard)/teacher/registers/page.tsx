"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, CheckCircle, XCircle, Clock, AlertTriangle, AlertCircle,
  Loader2, Save, CalendarDays, Users, Search, Filter,
  ChevronDown, ChevronLeft, ChevronRight, Sparkles,
  BarChart3, TrendingUp, TrendingDown, Minus,
  CheckCheck, RotateCcw, MessageSquare,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const GOLD = "#D4AF37";

interface ClassItem {
  id: string;
  name: string;
  grade_level: string;
  stream: string | null;
}

interface StudentItem {
  id: string;
  full_name: string;
  admission_number: string;
}

interface AttendanceRecord {
  student_id: string;
  status: "present" | "absent" | "late" | "excused";
  notes: string;
}

interface ExistingAttendance {
  id: string;
  student_id: string;
  status: string;
  notes: string | null;
}

interface WeeklyDay {
  date: string;
  label: string;
  short: string;
  isToday: boolean;
}

const STATUS_CONFIG = {
  present: {
    label: "Present",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.35)",
    hoverBg: "rgba(34,197,94,0.25)",
    icon: CheckCircle,
  },
  absent: {
    label: "Absent",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.35)",
    hoverBg: "rgba(239,68,68,0.25)",
    icon: XCircle,
  },
  late: {
    label: "Late",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.35)",
    hoverBg: "rgba(245,158,11,0.25)",
    icon: Clock,
  },
  excused: {
    label: "Excused",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.35)",
    hoverBg: "rgba(59,130,246,0.25)",
    icon: AlertTriangle,
  },
};

export default function TeacherAttendanceRegistersPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [existingAttendance, setExistingAttendance] = useState<Record<string, ExistingAttendance>>({});
  const [loading, setLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");
  const [weeklyData, setWeeklyData] = useState<Record<string, Record<string, string>>>({});
  const [fetchingWeekly, setFetchingWeekly] = useState(false);

  // Auth headers helper
  const getHeaders = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
    return headers;
  }, []);

  // Fetch teacher classes
  const fetchClasses = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/teacher/classes", { headers });
      if (!res.ok) throw new Error("Failed to fetch classes");
      const data = await res.json();
      const list = data.classes || [];
      setClasses(list);
      if (list.length > 0 && !selectedClass) {
        setSelectedClass(list[0].id);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Could not load classes");
    } finally {
      setLoading(false);
    }
  }, [getHeaders, selectedClass]);

  // Fetch students for class
  const fetchStudents = useCallback(async (classId: string) => {
    if (!classId) return;
    setFetchingStudents(true);
    setError("");
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/teacher/students?class_id=${classId}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch students");
      const data = await res.json();
      const studentList: StudentItem[] = data.students || [];
      setStudents(studentList);

      // Initialize attendance
      const initial: Record<string, AttendanceRecord> = {};
      studentList.forEach((s) => {
        initial[s.id] = {
          student_id: s.id,
          status: "present",
          notes: "",
        };
      });
      setAttendance(initial);
      setUnsavedChanges(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load students");
      toast.error(getErrorMessage(err) || "Could not load students");
    } finally {
      setFetchingStudents(false);
    }
  }, [getHeaders]);

  // Fetch existing attendance for date
  const fetchExistingAttendance = useCallback(async (classId: string, dateStr: string) => {
    if (!classId || !dateStr) return;
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/attendance?class_id=${classId}&date=${dateStr}`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      const existing: Record<string, ExistingAttendance> = {};
      const updatedAttendance: Record<string, AttendanceRecord> = {};

      (data.attendance || []).forEach((a: ExistingAttendance) => {
        existing[a.student_id] = a;
        updatedAttendance[a.student_id] = {
          student_id: a.student_id,
          status: a.status as AttendanceRecord["status"],
          notes: a.notes || "",
        };
      });

      setExistingAttendance(existing);
      // Merge with existing attendance records
      setAttendance((prev) => {
        const merged = { ...prev };
        Object.keys(updatedAttendance).forEach((sid) => {
          merged[sid] = updatedAttendance[sid];
        });
        return merged;
      });
    } catch (err) {
      console.error("Failed to fetch existing attendance:", err);
    }
  }, [getHeaders]);

  // Fetch weekly attendance
  const fetchWeeklyAttendance = useCallback(async (classId: string, weekStart: string) => {
    if (!classId) return;
    setFetchingWeekly(true);
    try {
      const headers = await getHeaders();
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      const res = await fetch(
        `/api/attendance?class_id=${classId}&start_date=${start.toISOString().split("T")[0]}&end_date=${end.toISOString().split("T")[0]}`,
        { headers }
      );
      if (!res.ok) return;
      const data = await res.json();
      const weekly: Record<string, Record<string, string>> = {};
      (data.attendance || []).forEach((a: { student_id: string; date: string; status: string }) => {
        if (!weekly[a.student_id]) weekly[a.student_id] = {};
        weekly[a.student_id][a.date] = a.status;
      });
      setWeeklyData(weekly);
    } catch (err) {
      console.error("Failed to fetch weekly attendance:", err);
    } finally {
      setFetchingWeekly(false);
    }
  }, [getHeaders]);

  // Initial load
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Load students when class changes
  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
      fetchExistingAttendance(selectedClass, date);
      if (viewMode === "weekly") {
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
        fetchWeeklyAttendance(selectedClass, weekStart.toISOString().split("T")[0]);
      }
    }
  }, [selectedClass, fetchStudents, fetchExistingAttendance, date, viewMode, fetchWeeklyAttendance]);

  // Reload existing attendance when date changes
  useEffect(() => {
    if (selectedClass && date) {
      fetchExistingAttendance(selectedClass, date);
    }
  }, [date, selectedClass, fetchExistingAttendance]);

  // Update attendance status
  const updateStatus = useCallback((studentId: string, status: AttendanceRecord["status"]) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
    setUnsavedChanges(true);
  }, []);

  // Update notes
  const updateNotes = useCallback((studentId: string, notes: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
    setUnsavedChanges(true);
  }, []);

  // Mark all present
  const markAllPresent = useCallback(() => {
    setAttendance((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((sid) => {
        updated[sid] = { ...updated[sid], status: "present" };
      });
      return updated;
    });
    setUnsavedChanges(true);
    toast.success("All students marked present");
  }, []);

  // Reset all to present
  const resetAll = useCallback(() => {
    setAttendance((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((sid) => {
        updated[sid] = { ...updated[sid], status: "present", notes: "" };
      });
      return updated;
    });
    setUnsavedChanges(true);
    toast.info("Attendance reset");
  }, []);

  // Save attendance
  const saveAttendance = useCallback(async () => {
    if (!selectedClass) {
      toast.error("Please select a class");
      return;
    }
    const entries = Object.values(attendance);
    if (entries.length === 0) {
      toast.error("No students to mark");
      return;
    }

    setSaving(true);
    const headers = await getHeaders();
    headers["Content-Type"] = "application/json";
    const errors: string[] = [];
    const saved: string[] = [];

    for (const entry of entries) {
      const payload = {
        student_id: entry.student_id,
        class_id: selectedClass,
        date,
        status: entry.status,
        notes: entry.notes || null,
      };

      try {
        const existing = existingAttendance[entry.student_id];
        let res;
        if (existing) {
          res = await fetch(`/api/attendance?id=${existing.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ status: entry.status, notes: entry.notes || null }),
          });
        } else {
          res = await fetch("/api/attendance", {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          errors.push(`${entry.student_id}: ${err.error || "Failed"}`);
        } else {
          saved.push(entry.student_id);
        }
      } catch (err) {
        errors.push(`${entry.student_id}: Network error`);
      }
    }

    setSaving(false);
    if (errors.length > 0) {
      toast.error(`Saved ${saved.length} of ${entries.length} records. ${errors.length} failed.`);
    } else {
      toast.success(`All ${saved.length} attendance records saved!`);
      setUnsavedChanges(false);
      fetchExistingAttendance(selectedClass, date);
    }
  }, [attendance, selectedClass, date, existingAttendance, getHeaders, fetchExistingAttendance]);

  // Date navigation
  const goToPrevDay = useCallback(() => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split("T")[0]);
  }, [date]);

  const goToNextDay = useCallback(() => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split("T")[0]);
  }, [date]);

  const goToToday = useCallback(() => {
    setDate(new Date().toISOString().split("T")[0]);
  }, []);

  // Weekly days
  const weeklyDays = useMemo(() => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    const days: WeeklyDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push({
        date: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" }),
        short: d.toLocaleDateString("en-GB", { weekday: "short" }),
        isToday: d.toISOString().split("T")[0] === new Date().toISOString().split("T")[0],
      });
    }
    return days;
  }, [date]);

  // Stats
  const stats = useMemo(() => {
    const entries = Object.values(attendance);
    const total = entries.length;
    const present = entries.filter((e) => e.status === "present").length;
    const absent = entries.filter((e) => e.status === "absent").length;
    const late = entries.filter((e) => e.status === "late").length;
    const excused = entries.filter((e) => e.status === "excused").length;
    return { total, present, absent, late, excused };
  }, [attendance]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter((s) =>
      s.full_name.toLowerCase().includes(q) ||
      s.admission_number.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const selectedClassInfo = classes.find((c) => c.id === selectedClass);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-8 h-8" style={{ color: GOLD }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Attendance Registers</h1>
          <p className="text-sm text-slate-400 mt-1">Mark and track student attendance with precision</p>
        </div>
        <div className="flex items-center gap-2">
          {unsavedChanges && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30"
            >
              Unsaved Changes
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Control Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Class */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Class *</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 appearance-none"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.stream ? `(${c.stream})` : ""} — {c.grade_level}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Date *</label>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevDay}
                className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="relative flex-1">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                />
              </div>
              <button
                onClick={goToNextDay}
                className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* View Mode */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">View</label>
            <div className="flex rounded-xl overflow-hidden border border-slate-700/50">
              <button
                onClick={() => setViewMode("daily")}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${
                  viewMode === "daily"
                    ? "text-slate-950"
                    : "text-slate-400 hover:text-white bg-slate-800/30"
                }`}
                style={viewMode === "daily" ? { background: GOLD } : undefined}
              >
                Daily
              </button>
              <button
                onClick={() => setViewMode("weekly")}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${
                  viewMode === "weekly"
                    ? "text-slate-950"
                    : "text-slate-400 hover:text-white bg-slate-800/30"
                }`}
                style={viewMode === "weekly" ? { background: GOLD } : undefined}
              >
                Weekly
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-end gap-2">
            <button
              onClick={markAllPresent}
              disabled={students.length === 0}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
              style={{ background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.3)", color: "#22c55e" }}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              All Present
            </button>
            <button
              onClick={resetAll}
              disabled={students.length === 0}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {students.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-700/30">
            {[
              { label: "Total", value: stats.total, color: "#94a3b8", icon: Users },
              { label: "Present", value: stats.present, color: "#22c55e", icon: CheckCircle },
              { label: "Absent", value: stats.absent, color: "#ef4444", icon: XCircle },
              { label: "Late", value: stats.late, color: "#f59e0b", icon: Clock },
              { label: "Excused", value: stats.excused, color: "#3b82f6", icon: AlertTriangle },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/30">
                <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                <div>
                  <p className="text-lg font-bold text-white leading-none">{s.value}</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-xl flex items-start gap-2.5"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + Save */}
      {selectedClass && viewMode === "daily" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap items-center gap-3"
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
            />
          </div>
          <button
            onClick={saveAttendance}
            disabled={saving || students.length === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-950 transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            style={{ background: GOLD }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Attendance
          </button>
        </motion.div>
      )}

      {/* Daily View */}
      {viewMode === "daily" && (
        <AnimatePresence mode="wait">
          {fetchingStudents ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-64"
            >
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
            </motion.div>
          ) : selectedClass && filteredStudents.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-slate-900/50 border border-slate-700/50 rounded-2xl"
            >
              <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white">
                {searchQuery ? "No students match your search" : "No students found"}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                {searchQuery ? "Try a different search term" : "Students will appear here once assigned to this class."}
              </p>
            </motion.div>
          ) : selectedClass ? (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-3 px-4 font-medium text-slate-400 text-[11px] uppercase tracking-wider">Student</th>
                      <th className="text-center py-3 px-2 font-medium text-slate-400 text-[11px] uppercase tracking-wider w-24">Present</th>
                      <th className="text-center py-3 px-2 font-medium text-slate-400 text-[11px] uppercase tracking-wider w-24">Absent</th>
                      <th className="text-center py-3 px-2 font-medium text-slate-400 text-[11px] uppercase tracking-wider w-24">Late</th>
                      <th className="text-center py-3 px-2 font-medium text-slate-400 text-[11px] uppercase tracking-wider w-24">Excused</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-400 text-[11px] uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {filteredStudents.map((student, i) => {
                      const record = attendance[student.id];
                      const currentStatus = record?.status || "present";
                      const hasExisting = !!existingAttendance[student.id];

                      return (
                        <motion.tr
                          key={student.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className={`hover:bg-slate-800/30 transition-colors ${hasExisting ? "bg-slate-800/10" : ""}`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                                style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}
                              >
                                {student.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{student.full_name}</p>
                                <p className="text-[10px] text-slate-500">{student.admission_number}</p>
                              </div>
                              {hasExisting && (
                                <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                              )}
                            </div>
                          </td>
                          {(["present", "absent", "late", "excused"] as const).map((status) => {
                            const config = STATUS_CONFIG[status];
                            const isActive = currentStatus === status;
                            return (
                              <td key={status} className="py-3 px-2">
                                <button
                                  onClick={() => updateStatus(student.id, status)}
                                  className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border"
                                  style={{
                                    background: isActive ? config.bg : "transparent",
                                    borderColor: isActive ? config.border : "rgba(51,65,85,0.3)",
                                    color: isActive ? config.color : "#64748b",
                                  }}
                                >
                                  <config.icon className="w-3.5 h-3.5 mx-auto mb-0.5" />
                                  {config.label}
                                </button>
                              </td>
                            );
                          })}
                          <td className="py-3 px-4">
                            <div className="relative">
                              <MessageSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                              <input
                                type="text"
                                value={record?.notes || ""}
                                onChange={(e) => updateNotes(student.id, e.target.value)}
                                placeholder="Add notes..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                              />
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-slate-900/50 border border-slate-700/50 rounded-2xl"
            >
              <ClipboardList className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white">Select a Class</h3>
              <p className="text-slate-500 text-sm mt-1">Choose a class and date above to start marking attendance.</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Weekly View */}
      {viewMode === "weekly" && selectedClass && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
        >
          {fetchingWeekly ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-3 px-4 font-medium text-slate-400 text-[11px] uppercase tracking-wider sticky left-0 bg-slate-900/60 z-10">Student</th>
                    {weeklyDays.map((day) => (
                      <th
                        key={day.date}
                        className={`text-center py-3 px-2 font-medium text-[11px] uppercase tracking-wider min-w-[80px] ${
                          day.isToday ? "text-amber-400" : "text-slate-400"
                        }`}
                      >
                        <div>{day.short}</div>
                        <div className="text-[9px] text-slate-600">{day.date.slice(5)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {students.map((student, i) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 sticky left-0 bg-slate-900/60 z-10">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}
                          >
                            {student.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white whitespace-nowrap">{student.full_name}</p>
                            <p className="text-[9px] text-slate-500">{student.admission_number}</p>
                          </div>
                        </div>
                      </td>
                      {weeklyDays.map((day) => {
                        const status = weeklyData[student.id]?.[day.date];
                        const config = status ? STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] : null;
                        return (
                          <td key={day.date} className="py-3 px-2 text-center">
                            {config ? (
                              <span
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-bold"
                                style={{
                                  background: config.bg,
                                  color: config.color,
                                  border: `1px solid ${config.border}`,
                                }}
                                title={config.label}
                              >
                                {config.label.charAt(0)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[10px] text-slate-700 border border-slate-800/50">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
