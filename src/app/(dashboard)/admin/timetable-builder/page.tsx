"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";
import SchoolDocumentHeader from "@/components/SchoolDocumentHeader";
import {
  Clock, MapPin, User, Plus, Trash2, Save, Printer, AlertTriangle,
  ChevronDown, ChevronUp, Settings, Palette, X, Check, Loader2,
  CalendarDays, GraduationCap, BookOpen
} from "lucide-react";

const GOLD = "#D4AF37";

type Slot = Database["public"]["Tables"]["timetable_slots"]["Row"];
type ClassItem = Database["public"]["Tables"]["classes"]["Row"];
type SubjectItem = Database["public"]["Tables"]["subjects"]["Row"];
type ProfileItem = Database["public"]["Tables"]["profiles"]["Row"];
type CampusItem = Database["public"]["Tables"]["campuses"]["Row"];

interface TimetableConfig {
  id: string;
  school_days: string[];
  time_slots: string[];
  lesson_duration_minutes: number;
  terms: string[];
  academic_year: string | null;
  start_time: string | null;
  end_time: string | null;
  grade_levels: string[] | null;
}

interface ReferenceData {
  classes: ClassItem[];
  teachers: ProfileItem[];
  campuses: CampusItem[];
  subjects: SubjectItem[];
}

export default function TimetableBuilderPage() {
  const [config, setConfig] = useState<TimetableConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [referenceData, setReferenceData] = useState<ReferenceData>({ classes: [], teachers: [], campuses: [], subjects: [] });
  const [refLoading, setRefLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedCampus, setSelectedCampus] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingSlots, setSavingSlots] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [newSlot, setNewSlot] = useState<Partial<Slot>>({});
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  const getHeaders = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
    return headers;
  }, []);

  // ========== FETCH CONFIG & REFERENCE DATA ==========
  useEffect(() => {
    const load = async () => {
      try {
        const headers = await getHeaders();
        const [configRes, refRes] = await Promise.all([
          fetch("/api/admin/timetable-config", { headers }),
          fetch("/api/admin/timetable-builder?action=reference", { headers }),
        ]);
        const configData = await configRes.json();
        const refData = await refRes.json();

        if (configData.config) {
          setConfig(configData.config);
          setSelectedTerm(configData.config.terms?.[0] || "");
          setSelectedAcademicYear(configData.config.academic_year || "");
        }
        if (refData) {
          setReferenceData({
            classes: refData.classes || [],
            teachers: refData.teachers || [],
            campuses: refData.campuses || [],
            subjects: refData.subjects || [],
          });
        }
      } catch (err: unknown) {
        toast.error("Failed to load timetable configuration");
        console.error(err);
      } finally {
        setConfigLoading(false);
        setRefLoading(false);
      }
    };
    load();
  }, [getHeaders]);

  // ========== FETCH SLOTS ==========
  const fetchSlots = useCallback(async () => {
    if (!selectedClass || !selectedCampus || !selectedTerm || !selectedAcademicYear) return;
    setSlotsLoading(true);
    try {
      const headers = await getHeaders();
      const params = new URLSearchParams({
        action: "list",
        class_id: selectedClass,
        campus_id: selectedCampus,
        term: selectedTerm,
        academic_year: selectedAcademicYear,
      });
      const res = await fetch(`/api/admin/timetable-builder?${params}`, { headers });
      const data = await res.json();
      if (data.slots) setSlots(data.slots);
      else setSlots([]);
    } catch (err: unknown) {
      toast.error("Failed to load timetable slots");
      console.error(err);
    } finally {
      setSlotsLoading(false);
    }
  }, [selectedClass, selectedCampus, selectedTerm, selectedAcademicYear, getHeaders]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // ========== CONFLICT DETECTION ==========
  const detectConflicts = useCallback((slotList: Slot[]) => {
    const issues: string[] = [];
    const byDayTime = new Map<string, Slot[]>();
    slotList.forEach((slot) => {
      const key = `${slot.day_of_week}-${slot.start_time}`;
      if (!byDayTime.has(key)) byDayTime.set(key, []);
      byDayTime.get(key)!.push(slot);
    });
    byDayTime.forEach((group) => {
      if (group.length > 1) {
        const names = group.map((s) => s.subject_name).join(", ");
        issues.push(`Multiple subjects at same time: ${names}`);
      }
    });
    // Teacher conflicts
    const byTeacher = new Map<string, Slot[]>();
    slotList.forEach((slot) => {
      if (slot.teacher_id) {
        const key = `${slot.teacher_id}-${slot.day_of_week}-${slot.start_time}`;
        if (!byTeacher.has(key)) byTeacher.set(key, []);
        byTeacher.get(key)!.push(slot);
      }
    });
    byTeacher.forEach((group) => {
      if (group.length > 1) {
        const tName = referenceData.teachers.find((t) => t.id === group[0].teacher_id)?.full_name || "Teacher";
        issues.push(`${tName} is assigned to multiple classes at the same time`);
      }
    });
    // Room conflicts
    const byRoom = new Map<string, Slot[]>();
    slotList.forEach((slot) => {
      if (slot.room) {
        const key = `${slot.room}-${slot.day_of_week}-${slot.start_time}`;
        if (!byRoom.has(key)) byRoom.set(key, []);
        byRoom.get(key)!.push(slot);
      }
    });
    byRoom.forEach((group) => {
      if (group.length > 1) {
        issues.push(`Room ${group[0].room} has multiple classes at the same time`);
      }
    });
    return issues;
  }, [referenceData.teachers]);

  useEffect(() => {
    setConflicts(detectConflicts(slots));
  }, [slots, detectConflicts]);

  // ========== SAVE CONFIG ==========
  const saveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/admin/timetable-config", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save config");
      toast.success("Timetable configuration saved");
      setShowConfigPanel(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingConfig(false);
    }
  };

  // ========== SAVE SLOTS ==========
  const saveSlots = async () => {
    if (!selectedClass || !selectedCampus || !selectedTerm || !selectedAcademicYear) {
      toast.error("Please select class, campus, term, and academic year");
      return;
    }
    setSavingSlots(true);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/admin/timetable-builder", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          class_id: selectedClass,
          campus_id: selectedCampus,
          term: selectedTerm,
          academic_year: selectedAcademicYear,
          slots: slots.map((s) => ({
            id: s.id,
            subject_name: s.subject_name,
            subject_id: s.subject_id,
            teacher_id: s.teacher_id,
            room: s.room,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_active: s.is_active,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save timetable");
      toast.success("Timetable saved successfully");
      fetchSlots();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingSlots(false);
    }
  };

  // ========== ADD / EDIT / DELETE SLOT ==========
  const openAddModal = (dayIndex: number, timeSlot: string) => {
    const dayName = config?.school_days?.[dayIndex] || "Monday";
    const duration = config?.lesson_duration_minutes || 40;
    const [h, m] = timeSlot.split(":").map(Number);
    const endDate = new Date(2000, 0, 1, h, m + duration);
    const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

    setNewSlot({
      day_of_week: dayIndex,
      start_time: timeSlot,
      end_time: endTime,
      subject_name: "",
      subject_id: null,
      teacher_id: null,
      room: "",
      is_active: true,
    });
    setEditingSlot(null);
    setShowSlotModal(true);
  };

  const openEditModal = (slot: Slot) => {
    setEditingSlot(slot);
    setNewSlot({ ...slot });
    setShowSlotModal(true);
  };

  const saveSlotModal = () => {
    if (!newSlot.subject_name?.trim()) {
      toast.error("Subject name is required");
      return;
    }
    if (editingSlot) {
      setSlots((prev) => prev.map((s) => (s.id === editingSlot.id ? { ...s, ...newSlot } as Slot : s)));
    } else {
      const tempSlot: Slot = {
        id: `temp-${Date.now()}`,
        class_id: selectedClass,
        subject_name: newSlot.subject_name || "",
        subject_id: newSlot.subject_id || null,
        teacher_id: newSlot.teacher_id || null,
        room: newSlot.room || null,
        day_of_week: newSlot.day_of_week ?? 0,
        start_time: newSlot.start_time || "08:00",
        end_time: newSlot.end_time || "08:40",
        academic_year: selectedAcademicYear,
        term: selectedTerm,
        campus_id: selectedCampus,
        is_active: true,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSlots((prev) => [...prev, tempSlot]);
    }
    setShowSlotModal(false);
    toast.success(editingSlot ? "Slot updated" : "Slot added");
  };

  const deleteSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
    toast.success("Slot removed");
  };

  // ========== SUBJECT COLOR HELPERS ==========
  const getSubjectColor = (subjectName: string, subjectId: string | null) => {
    if (subjectId) {
      const subj = referenceData.subjects.find((s) => s.id === subjectId);
      if (subj?.color) return subj.color;
    }
    // Fallback to name-based hash
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getSubjectBg = (subjectName: string, subjectId: string | null) => {
    const color = getSubjectColor(subjectName, subjectId);
    return `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.12)`;
  };

  const getSubjectBorder = (subjectName: string, subjectId: string | null) => {
    const color = getSubjectColor(subjectName, subjectId);
    return `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.35)`;
  };

  // ========== RENDER ==========
  const days = config?.school_days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timeSlots = config?.time_slots || ["08:00", "08:40", "09:20", "10:00", "10:40", "11:20", "12:00", "12:40", "13:20", "14:00", "14:40", "15:20"];
  const terms = config?.terms || ["Term 1", "Term 2", "Term 3"];
  const academicYears = ["2024-2025", "2025-2026", "2026-2027", "2027-2028"];

  const filteredClasses = selectedCampus
    ? referenceData.classes.filter((c) => c.campus_id === selectedCampus)
    : referenceData.classes;

  if (configLoading || refLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6" style={{ color: GOLD }} /> Timetable Builder
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure school days, time slots, and build class timetables dynamically.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfigPanel(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-slate-700/50 hover:bg-slate-800/50 transition-all flex items-center gap-2"
          >
            <Settings className="w-4 h-4" /> Configure
          </button>
          <button
            onClick={() => setShowPrintPreview(true)}
            disabled={!selectedClass || slots.length === 0}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-slate-700/50 hover:bg-slate-800/50 transition-all flex items-center gap-2 disabled:opacity-30"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={saveSlots}
            disabled={savingSlots || !selectedClass}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-950 transition-all hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
            style={{ background: GOLD }}
          >
            {savingSlots ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Timetable
          </button>
        </div>
      </div>

      {/* Conflict Banner */}
      <AnimatePresence>
        {conflicts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-red-300">{conflicts.length} Conflict(s) Detected</span>
            </div>
            <ul className="space-y-1">
              {conflicts.map((c, i) => (
                <li key={i} className="text-xs text-red-300/80 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" /> {c}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Academic Year</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
            >
              <option value="">Select year</option>
              {academicYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
            >
              <option value="">Select term</option>
              {terms.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Campus</label>
            <select
              value={selectedCampus}
              onChange={(e) => { setSelectedCampus(e.target.value); setSelectedClass(""); }}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
            >
              <option value="">Select campus</option>
              {referenceData.campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
            >
              <option value="">
                {selectedCampus
                  ? filteredClasses.length === 0
                    ? "No classes for this campus"
                    : "Select class"
                  : "Select campus first"}
              </option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.grade_level}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      {selectedClass ? (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          {slotsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">Time</th>
                    {days.map((day, i) => (
                      <th key={day} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[140px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time) => (
                    <tr key={time} className="border-b border-slate-700/30 hover:bg-slate-800/20">
                      <td className="px-3 py-2 text-xs font-mono text-slate-400 whitespace-nowrap">{time}</td>
                      {days.map((_, dayIndex) => {
                        const slot = slots.find(
                          (s) => s.day_of_week === dayIndex && s.start_time === time
                        );
                        return (
                          <td key={`${time}-${dayIndex}`} className="px-2 py-2 align-top">
                            {slot ? (
                              <motion.div
                                layoutId={slot.id}
                                onClick={() => openEditModal(slot)}
                                className="rounded-xl p-2.5 cursor-pointer transition-all hover:scale-[1.02] border"
                                style={{
                                  backgroundColor: getSubjectBg(slot.subject_name, slot.subject_id),
                                  borderColor: getSubjectBorder(slot.subject_name, slot.subject_id),
                                }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold text-white truncate">{slot.subject_name}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteSlot(slot.id); }}
                                    className="text-slate-500 hover:text-red-400 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                {slot.teacher_id && (
                                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <User className="w-2.5 h-2.5" />
                                    {referenceData.teachers.find((t) => t.id === slot.teacher_id)?.full_name || "Teacher"}
                                  </p>
                                )}
                                {slot.room && (
                                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5" /> {slot.room}
                                  </p>
                                )}
                              </motion.div>
                            ) : (
                              <button
                                onClick={() => openAddModal(dayIndex, time)}
                                className="w-full h-full min-h-[60px] rounded-xl border border-dashed border-slate-700/40 hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 transition-all flex items-center justify-center text-slate-600 hover:text-[#D4AF37]"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-12 text-center">
          <CalendarDays className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">Select filters to view timetable</h3>
          <p className="text-sm text-slate-600 mt-2">Choose academic year, term, campus, and class to build or edit the timetable.</p>
        </div>
      )}

      {/* Slot Modal */}
      <AnimatePresence>
        {showSlotModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowSlotModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingSlot ? "Edit Slot" : "Add Slot"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Subject *</label>
                  <select
                    value={newSlot.subject_id || ""}
                    onChange={(e) => {
                      const subj = referenceData.subjects.find((s) => s.id === e.target.value);
                      setNewSlot((prev) => ({
                        ...prev,
                        subject_id: e.target.value || null,
                        subject_name: subj?.name || prev.subject_name || "",
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  >
                    <option value="">Select from subjects</option>
                    {referenceData.subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Or type subject name</label>
                  <input
                    type="text"
                    value={newSlot.subject_name || ""}
                    onChange={(e) => setNewSlot((prev) => ({ ...prev, subject_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    placeholder="e.g. Mathematics"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Teacher</label>
                  <select
                    value={newSlot.teacher_id || ""}
                    onChange={(e) => setNewSlot((prev) => ({ ...prev, teacher_id: e.target.value || null }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  >
                    <option value="">Select teacher</option>
                    {referenceData.teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Room</label>
                  <input
                    type="text"
                    value={newSlot.room || ""}
                    onChange={(e) => setNewSlot((prev) => ({ ...prev, room: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    placeholder="e.g. Room 101"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Start Time</label>
                    <input
                      type="time"
                      value={newSlot.start_time || ""}
                      onChange={(e) => setNewSlot((prev) => ({ ...prev, start_time: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">End Time</label>
                    <input
                      type="time"
                      value={newSlot.end_time || ""}
                      onChange={(e) => setNewSlot((prev) => ({ ...prev, end_time: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Day</label>
                  <select
                    value={newSlot.day_of_week ?? 0}
                    onChange={(e) => setNewSlot((prev) => ({ ...prev, day_of_week: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  >
                    {days.map((day, i) => (
                      <option key={day} value={i}>{day}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowSlotModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSlotModal}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-950 transition-all hover:opacity-90"
                  style={{ background: GOLD }}
                >
                  {editingSlot ? "Update" : "Add"} Slot
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Config Panel */}
      <AnimatePresence>
        {showConfigPanel && config && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowConfigPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" style={{ color: GOLD }} /> Timetable Configuration
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">School Days</label>
                  <div className="flex flex-wrap gap-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                      const selected = config.school_days?.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            const current = config.school_days || [];
                            const updated = selected
                              ? current.filter((d) => d !== day)
                              : [...current, day];
                            setConfig({ ...config, school_days: updated });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            selected
                              ? "bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37]"
                              : "bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {selected && <Check className="w-3 h-3 inline mr-1" />}
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Time Slots (one per line)</label>
                  <textarea
                    value={(config.time_slots || []).join("\n")}
                    onChange={(e) => {
                      const slots = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
                      setConfig({ ...config, time_slots: slots });
                    }}
                    rows={6}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 resize-none"
                    placeholder="08:00\n08:40\n09:20"
                  />
                  <p className="text-[10px] text-slate-600 mt-1">Enter each time slot on a new line (HH:MM format)</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Lesson Duration (min)</label>
                    <input
                      type="number"
                      value={config.lesson_duration_minutes || 40}
                      onChange={(e) => setConfig({ ...config, lesson_duration_minutes: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                      min={10}
                      max={180}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Academic Year</label>
                    <input
                      type="text"
                      value={config.academic_year || ""}
                      onChange={(e) => setConfig({ ...config, academic_year: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                      placeholder="e.g. 2025-2026"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Terms (comma-separated)</label>
                  <input
                    type="text"
                    value={(config.terms || []).join(", ")}
                    onChange={(e) => setConfig({ ...config, terms: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    placeholder="Term 1, Term 2, Term 3"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Grade Levels (one per line)</label>
                  <textarea
                    value={(config.grade_levels || []).join("\n")}
                    onChange={(e) => {
                      const grades = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
                      setConfig({ ...config, grade_levels: grades });
                    }}
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 resize-none"
                    placeholder="Playgroup\nPP1\nGrade 1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowConfigPanel(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveConfig}
                  disabled={savingConfig}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-950 transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  style={{ background: GOLD }}
                >
                  {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Preview */}
      <AnimatePresence>
        {showPrintPreview && selectedClass && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white overflow-y-auto"
          >
            <div className="max-w-5xl mx-auto p-8">
              <div className="no-print flex justify-end gap-2 mb-4">
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-600 border border-slate-300 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-950"
                  style={{ background: GOLD }}
                >
                  <Printer className="w-4 h-4 inline mr-1" /> Print
                </button>
              </div>
              <SchoolDocumentHeader
                title="Class Timetable"
                subtitle={`${filteredClasses.find((c) => c.id === selectedClass)?.name || ""} — ${selectedTerm} ${selectedAcademicYear}`}
              />
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900">
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-900 uppercase w-20">Time</th>
                      {days.map((day) => (
                        <th key={day} className="px-3 py-2 text-left text-xs font-bold text-slate-900 uppercase">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((time) => (
                      <tr key={time} className="border-b border-slate-200">
                        <td className="px-3 py-2 text-xs font-mono text-slate-600">{time}</td>
                        {days.map((_, dayIndex) => {
                          const slot = slots.find((s) => s.day_of_week === dayIndex && s.start_time === time);
                          return (
                            <td key={`${time}-${dayIndex}`} className="px-2 py-2 align-top">
                              {slot ? (
                                <div className="rounded-lg p-2 border" style={{
                                  backgroundColor: getSubjectBg(slot.subject_name, slot.subject_id),
                                  borderColor: getSubjectBorder(slot.subject_name, slot.subject_id),
                                }}>
                                  <p className="text-xs font-semibold text-slate-900">{slot.subject_name}</p>
                                  {slot.room && <p className="text-[10px] text-slate-600">Room: {slot.room}</p>}
                                </div>
                              ) : (
                                <div className="h-8" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-300 text-[10px] text-slate-500 text-center">
                Bishop Davis Joy Academy — Official Timetable Document
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
