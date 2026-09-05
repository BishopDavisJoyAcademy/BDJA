"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, MapPin, BookOpen, GraduationCap, Users,
  Loader2, AlertCircle, ChevronDown, Plus, Sparkles,
  Sun, Sunrise, Sunset, Moon, Pencil, Trash2, X,
  CheckCircle2, Search,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const GOLD = "#D4AF37";

interface TimetableEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  topic: string | null;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  classes: { id: string; name: string; grade_level: string } | null;
  subjects: { id: string; name: string; code: string | null } | null;
}

interface ClassInfo {
  id: string;
  name: string;
  grade_level: string;
}

interface SubjectInfo {
  id: string;
  name: string;
  code: string | null;
}

interface TeacherInfo {
  id: string;
  full_name: string;
}

interface ClassSubjectEntry {
  class_id: string;
  subject_id: string;
  subjects: { id: string; name: string; code: string | null } | null;
  classes: { id: string; name: string; grade_level: string } | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TIME_SLOTS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getTimeOfDayIcon(time: string) {
  const h = parseInt(time.split(":")[0]);
  if (h < 10) return Sunrise;
  if (h < 13) return Sun;
  if (h < 16) return Sunset;
  return Moon;
}

function getSubjectColor(subjectName: string): string {
  const colors: Record<string, string> = {
    Math: "#3b82f6", English: "#ef4444", Science: "#22c55e",
    "Social Studies": "#f59e0b", Kiswahili: "#a855f7", CRE: "#ec4899",
    IRE: "#06b6d4", "Physical Education": "#f97316", Art: "#8b5cf6",
    Music: "#d946ef", Agriculture: "#84cc16", "Computer Studies": "#0ea5e9",
  };
  return colors[subjectName] || GOLD;
}

interface FormData {
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
  topic: string;
}

const emptyForm: FormData = {
  class_id: "",
  subject_id: "",
  teacher_id: "",
  day_of_week: 1,
  start_time: "08:00",
  end_time: "09:00",
  room: "",
  topic: "",
};

export default function TeacherTimetablesPage() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [allClasses, setAllClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubjectEntry[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canManage, setCanManage] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getHeaders = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
    return headers;
  }, []);

  const fetchTimetable = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/teacher/timetables", { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch timetable");
      }
      const data = await res.json();
      setTimetable(data.timetable || []);
      setClasses(data.classes || []);
      setClassSubjects(data.class_subjects || []);
      setAllClasses(data.all_classes || []);
      setCanManage(data.can_manage || false);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load timetable");
      toast.error(getErrorMessage(err) || "Could not load timetable");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const fetchSubjects = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/teacher/subjects", { headers });
      if (!res.ok) return;
      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
    }
  }, [getHeaders]);

  const fetchTeachers = useCallback(async () => {
    if (!canManage) return;
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/admin/staff", { headers });
      if (!res.ok) return;
      const data = await res.json();
      const staffList = (data.staff || []).map((s: { id: string; full_name: string }) => ({
        id: s.id,
        full_name: s.full_name,
      }));
      setTeachers(staffList);
    } catch (err) {
      console.error("Failed to fetch teachers:", err);
    }
  }, [canManage, getHeaders]);

  useEffect(() => {
    fetchTimetable();
    fetchSubjects();
  }, [fetchTimetable, fetchSubjects]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Filtered timetable
  const filteredTimetable = useMemo(() => {
    let entries = timetable;
    if (selectedClass !== "all") {
      entries = entries.filter((e) => e.class_id === selectedClass);
    }
    return entries;
  }, [timetable, selectedClass]);

  // Group by day
  const byDay = useMemo(() => {
    const map = new Map<number, TimetableEntry[]>();
    DAYS.forEach((_, i) => map.set(i, []));
    filteredTimetable.forEach((entry) => {
      const dayIndex = entry.day_of_week - 1;
      if (dayIndex >= 0 && dayIndex < 7) {
        const list = map.get(dayIndex) || [];
        list.push(entry);
        list.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
        map.set(dayIndex, list);
      }
    });
    return map;
  }, [filteredTimetable]);

  const todayEntries = useMemo(() => {
    return byDay.get(selectedDay) || [];
  }, [byDay, selectedDay]);

  const nextLesson = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const today = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const entries = byDay.get(today) || [];
    return entries.find((e) => timeToMinutes(e.start_time) > currentMinutes) || null;
  }, [byDay]);

  const stats = useMemo(() => {
    const total = filteredTimetable.length;
    const bySubject = new Map<string, number>();
    filteredTimetable.forEach((e) => {
      const name = e.subjects?.name || "Unknown";
      bySubject.set(name, (bySubject.get(name) || 0) + 1);
    });
    return { total, subjects: bySubject.size };
  }, [filteredTimetable]);

  // Modal handlers
  const openAddModal = useCallback(() => {
    setEditingEntry(null);
    setFormData(emptyForm);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((entry: TimetableEntry) => {
    setEditingEntry(entry);
    setFormData({
      class_id: entry.class_id,
      subject_id: entry.subject_id,
      teacher_id: entry.teacher_id || "",
      day_of_week: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time,
      room: entry.room || "",
      topic: entry.topic || "",
    });
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingEntry(null);
    setFormData(emptyForm);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.class_id || !formData.subject_id || !formData.start_time || !formData.end_time) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (timeToMinutes(formData.start_time) >= timeToMinutes(formData.end_time)) {
      toast.error("End time must be after start time");
      return;
    }

    setSaving(true);
    try {
      const headers = await getHeaders();
      headers["Content-Type"] = "application/json";

      let res;
      if (editingEntry) {
        res = await fetch(`/api/teacher/timetables?id=${editingEntry.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(formData),
        });
      } else {
        res = await fetch("/api/teacher/timetables", {
          method: "POST",
          headers,
          body: JSON.stringify(formData),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save timetable entry");
      }

      toast.success(editingEntry ? "Timetable entry updated" : "Timetable entry created");
      closeModal();
      fetchTimetable();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [formData, editingEntry, getHeaders, closeModal, fetchTimetable]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this timetable entry?")) return;
    setDeletingId(id);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/teacher/timetables?id=${id}`, { method: "DELETE", headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Timetable entry deleted");
      fetchTimetable();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }, [getHeaders, fetchTimetable]);

  // Available classes for dropdown
  const availableClasses = canManage ? allClasses : classes;

  // Filter subjects by selected class
  const availableSubjects = useMemo(() => {
    if (!formData.class_id) return subjects;
    const classSubjectIds = classSubjects
      .filter((cs) => cs.class_id === formData.class_id)
      .map((cs) => cs.subject_id);
    if (classSubjectIds.length === 0) return subjects;
    return subjects.filter((s) => classSubjectIds.includes(s.id));
  }, [formData.class_id, subjects, classSubjects]);

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
          <h1 className="text-2xl font-semibold text-white">Teaching Timetable</h1>
          <p className="text-sm text-slate-400 mt-1">Manage class schedules and teaching sessions</p>
        </div>
        <div className="flex items-center gap-3">
          {nextLesson && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-4 py-2 rounded-xl border text-xs"
              style={{ background: `${GOLD}10`, borderColor: `${GOLD}30`, color: GOLD }}
            >
              <span className="font-medium">Next:</span> {nextLesson.subjects?.name} @ {formatTime(nextLesson.start_time)} in {nextLesson.classes?.name}
            </motion.div>
          )}
          {canManage && (
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-950 transition-all hover:opacity-90 flex items-center gap-2"
              style={{ background: GOLD }}
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          )}
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="pl-10 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 appearance-none"
          >
            <option value="all">All Classes</option>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.grade_level}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>

        <div className="flex rounded-xl overflow-hidden border border-slate-700/50">
          <button
            onClick={() => setViewMode("week")}
            className={`px-4 py-2 text-xs font-medium transition-all ${
              viewMode === "week" ? "text-slate-950" : "text-slate-400 hover:text-white bg-slate-800/30"
            }`}
            style={viewMode === "week" ? { background: GOLD } : undefined}
          >
            Week View
          </button>
          <button
            onClick={() => setViewMode("day")}
            className={`px-4 py-2 text-xs font-medium transition-all ${
              viewMode === "day" ? "text-slate-950" : "text-slate-400 hover:text-white bg-slate-800/30"
            }`}
            style={viewMode === "day" ? { background: GOLD } : undefined}
          >
            Day View
          </button>
        </div>

        {stats.total > 0 && (
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" style={{ color: GOLD }} />
              <span>{stats.total} sessions</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <BookOpen className="w-3.5 h-3.5" style={{ color: GOLD }} />
              <span>{stats.subjects} subjects</span>
            </div>
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

      {/* Empty State */}
      {timetable.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8 text-center"
        >
          <Calendar className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Timetable Entries Yet</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
            Your teaching schedule hasn&apos;t been set up yet.{canManage && " Use the Add Entry button to create sessions."}
          </p>
          {classes.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Your Assigned Classes</p>
              <div className="flex flex-wrap justify-center gap-2">
                {classes.map((c) => (
                  <span
                    key={c.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                    style={{ background: `${GOLD}10`, borderColor: `${GOLD}30`, color: GOLD }}
                  >
                    {c.name} — {c.grade_level}
                  </span>
                ))}
              </div>
            </div>
          )}
          {classSubjects.length > 0 && (
            <div className="space-y-3 mt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Your Subject Assignments</p>
              <div className="flex flex-wrap justify-center gap-2">
                {classSubjects.map((cs, i) => (
                  <span
                    key={`${cs.class_id}-${cs.subject_id}-${i}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700/50 text-slate-400"
                  >
                    {cs.subjects?.name} @ {cs.classes?.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Week View */}
      {viewMode === "week" && timetable.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
        >
          {DAYS.map((dayName, dayIndex) => {
            const entries = byDay.get(dayIndex) || [];
            const isToday = dayIndex === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
            return (
              <motion.div
                key={dayName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + dayIndex * 0.05 }}
                className={`bg-slate-900/60 border rounded-2xl overflow-hidden ${
                  isToday ? "border-amber-500/30" : "border-slate-700/50"
                }`}
              >
                <div className={`p-4 border-b ${isToday ? "border-amber-500/20 bg-amber-500/5" : "border-slate-700/50"}`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-semibold ${isToday ? "text-amber-400" : "text-white"}`}>
                      {dayName}
                      {isToday && <span className="ml-2 text-[10px] font-normal text-amber-400/70">(Today)</span>}
                    </h3>
                    <span className="text-xs text-slate-500">{entries.length} sessions</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                  {entries.length === 0 ? (
                    <p className="text-center text-xs text-slate-600 py-4">No sessions</p>
                  ) : (
                    entries.map((entry, i) => {
                      const subjectColor = getSubjectColor(entry.subjects?.name || "");
                      const TimeIcon = getTimeOfDayIcon(entry.start_time);
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="p-3 rounded-xl border transition-all hover:bg-slate-800/40 group relative"
                          style={{ borderColor: `${subjectColor}20`, background: `${subjectColor}08` }}
                        >
                          {canManage && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(entry)}
                                className="p-1 rounded-md bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                disabled={deletingId === entry.id}
                                className="p-1 rounded-md bg-slate-800/80 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                              >
                                {deletingId === entry.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              </button>
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2 pr-12">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ background: subjectColor }}
                                />
                                <p className="text-sm font-medium text-white truncate">
                                  {entry.subjects?.name || "Unknown Subject"}
                                </p>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 ml-4">
                                {entry.classes?.name} — {entry.classes?.grade_level}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 ml-4">
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <TimeIcon className="w-3 h-3" />
                              {formatTime(entry.start_time)} — {formatTime(entry.end_time)}
                            </span>
                            {entry.room && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                <MapPin className="w-3 h-3" />
                                {entry.room}
                              </span>
                            )}
                          </div>
                          {entry.topic && (
                            <p className="text-[10px] text-slate-500 mt-1 ml-4 italic">{entry.topic}</p>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Day View */}
      {viewMode === "day" && timetable.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {/* Day selector */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {DAYS.map((dayName, i) => {
              const isSelected = selectedDay === i;
              const isToday = i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
              return (
                <button
                  key={dayName}
                  onClick={() => setSelectedDay(i)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                    isSelected
                      ? "text-slate-950 border-transparent"
                      : "text-slate-400 border-slate-700/50 hover:bg-slate-800/50"
                  }`}
                  style={isSelected ? { background: GOLD } : undefined}
                >
                  {dayName}
                  {isToday && <span className="ml-1 text-[9px]">(Today)</span>}
                </button>
              );
            })}
          </div>

          {/* Timeline */}
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
            {todayEntries.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No sessions scheduled for {DAYS[selectedDay]}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEntries.map((entry, i) => {
                  const subjectColor = getSubjectColor(entry.subjects?.name || "");
                  const TimeIcon = getTimeOfDayIcon(entry.start_time);
                  const startMin = timeToMinutes(entry.start_time);
                  const endMin = timeToMinutes(entry.end_time);
                  const duration = endMin - startMin;

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-4 p-4 rounded-xl border transition-all hover:bg-slate-800/30 group relative"
                      style={{ borderColor: `${subjectColor}25` }}
                    >
                      {canManage && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(entry)}
                            className="p-1.5 rounded-md bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingId === entry.id}
                            className="p-1.5 rounded-md bg-slate-800/80 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            {deletingId === entry.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                      {/* Time column */}
                      <div className="w-20 shrink-0 text-right">
                        <p className="text-sm font-bold text-white">{formatTime(entry.start_time)}</p>
                        <p className="text-[10px] text-slate-500">{formatTime(entry.end_time)}</p>
                        <p className="text-[9px] text-slate-600 mt-0.5">{duration} min</p>
                      </div>

                      {/* Connector */}
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className="w-3 h-3 rounded-full border-2"
                          style={{ borderColor: subjectColor, background: `${subjectColor}30` }}
                        />
                        <div className="w-px flex-1 bg-slate-700/50 min-h-[20px]" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-4 pr-16">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                            style={{ background: `${subjectColor}15`, color: subjectColor }}
                          >
                            {entry.subjects?.name || "Unknown"}
                          </span>
                          {entry.subjects?.code && (
                            <span className="text-[10px] text-slate-500">{entry.subjects.code}</span>
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-white">
                          {entry.classes?.name} — {entry.classes?.grade_level}
                        </h4>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <MapPin className="w-3 h-3" />
                            {entry.room || "No room assigned"}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Users className="w-3 h-3" />
                            {entry.classes?.name}
                          </span>
                        </div>
                        {entry.topic && (
                          <p className="text-[10px] text-slate-500 mt-1.5 italic">Topic: {entry.topic}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {editingEntry ? "Edit Timetable Entry" : "Add Timetable Entry"}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Class */}
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Class *</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      value={formData.class_id}
                      onChange={(e) => setFormData((prev) => ({ ...prev, class_id: e.target.value, subject_id: "" }))}
                      className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 appearance-none"
                    >
                      <option value="">Select Class</option>
                      {availableClasses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} — {c.grade_level}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Subject *</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      value={formData.subject_id}
                      onChange={(e) => setFormData((prev) => ({ ...prev, subject_id: e.target.value }))}
                      disabled={!formData.class_id}
                      className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 appearance-none disabled:opacity-40"
                    >
                      <option value="">Select Subject</option>
                      {availableSubjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ""}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Teacher (only for managers) */}
                {canManage && (
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Teacher</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <select
                        value={formData.teacher_id}
                        onChange={(e) => setFormData((prev) => ({ ...prev, teacher_id: e.target.value }))}
                        className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 appearance-none"
                      >
                        <option value="">Assign to Me</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.full_name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Day */}
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Day *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      value={formData.day_of_week}
                      onChange={(e) => setFormData((prev) => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                      className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 appearance-none"
                    >
                      {DAYS.map((d, i) => (
                        <option key={d} value={i + 1}>{d}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Start Time *</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <select
                        value={formData.start_time}
                        onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                        className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 appearance-none"
                      >
                        {TIME_SLOTS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">End Time *</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <select
                        value={formData.end_time}
                        onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))}
                        className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 appearance-none"
                      >
                        {TIME_SLOTS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Room */}
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Room</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={formData.room}
                      onChange={(e) => setFormData((prev) => ({ ...prev, room: e.target.value }))}
                      placeholder="e.g. Room 101"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                    />
                  </div>
                </div>

                {/* Topic */}
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Topic</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData((prev) => ({ ...prev, topic: e.target.value }))}
                    placeholder="e.g. Introduction to Algebra"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-slate-700/50 flex items-center justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-950 transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  style={{ background: GOLD }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {saving ? "Saving..." : (editingEntry ? "Update" : "Create")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
