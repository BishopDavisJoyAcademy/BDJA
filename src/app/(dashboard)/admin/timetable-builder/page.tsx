"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  Loader2, Plus, Trash2, X, Save, Printer, AlertTriangle, CheckCircle,
  Clock, Calendar, GraduationCap, User, MapPin, ChevronLeft, ChevronRight,
  Palette, GripVertical, Eye, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface TimetableSlot {
  id: string;
  class_id: string;
  subject_name: string;
  teacher_id: string | null;
  room: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  academic_year: string;
  term: string;
  campus_id: string | null;
  is_active: boolean | null;
  created_by: string | null;
  created_at: string | null;
  classes?: { name: string; grade_level: string } | null;
  profiles?: { full_name: string } | null;
}

interface ClassOption {
  id: string;
  name: string;
  grade_level: string;
}

interface TeacherOption {
  id: string;
  full_name: string;
  department: string | null;
}

interface CampusOption {
  id: string;
  name: string;
}

interface Conflict {
  type: "teacher" | "room" | "class";
  message: string;
  conflictingSlotId: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TERMS = ["Term 1", "Term 2", "Term 3"];
const TIME_SLOTS = [
  "08:00", "08:40", "09:20", "10:00", "10:40", "11:20",
  "12:00", "12:40", "13:20", "14:00", "14:40", "15:20",
];

const SUBJECT_COLORS: Record<string, string> = {
  "Mathematics": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "English": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Science": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Social Studies": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Kiswahili": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "CRE": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "ICT": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "Art": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "Music": "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "PE": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Agriculture": "bg-lime-500/20 text-lime-300 border-lime-500/30",
  "Business": "bg-teal-500/20 text-teal-300 border-teal-500/30",
};

function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] || "bg-slate-700/40 text-slate-300 border-slate-600/30";
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export default function TimetableBuilderPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedYear, setSelectedYear] = useState("2025-2026");
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [selectedCampus, setSelectedCampus] = useState("");

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedTime, setSelectedTime] = useState("");

  const [slotForm, setSlotForm] = useState({
    subject_name: "",
    teacher_id: "",
    room: "",
  });

  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [isPrintView, setIsPrintView] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [classesRes, teachersRes, campusesRes] = await Promise.all([
        apiGet<{ classes: ClassOption[] }>("/api/admin/classes"),
        apiGet<{ staff: Array<{ id: string; profiles: { full_name: string }; department: string | null }> }>("/api/admin/staff?status=active"),
        apiGet<{ campuses: CampusOption[] }>("/api/admin/campuses"),
      ]);
      setClasses(classesRes.classes || []);
      setTeachers((teachersRes.staff || []).map((s) => ({
        id: s.id,
        full_name: s.profiles?.full_name || "Unknown",
        department: s.department,
      })));
      setCampuses(campusesRes.campuses || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  }, []);

  const fetchSlots = useCallback(async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("class_id", selectedClass);
      params.set("academic_year", selectedYear);
      params.set("term", selectedTerm);

      const data = await apiGet<{ slots: TimetableSlot[] }>(`/api/admin/timetable-builder?${params.toString()}`);
      setSlots(data.slots || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [selectedClass, selectedYear, selectedTerm]);

  useEffect(() => {
    if (user?.user_category === "admin") {
      fetchReferenceData();
    }
  }, [user, fetchReferenceData]);

  useEffect(() => {
    if (selectedClass) {
      fetchSlots();
    }
  }, [selectedClass, selectedYear, selectedTerm, fetchSlots]);

  const gridSlots = useMemo(() => {
    const grid: Record<string, TimetableSlot[]> = {};
    for (let d = 0; d < 6; d++) {
      for (let t = 0; t < TIME_SLOTS.length - 1; t++) {
        const key = `${d}-${TIME_SLOTS[t]}`;
        grid[key] = [];
      }
    }
    for (const slot of slots) {
      const key = `${slot.day_of_week}-${slot.start_time}`;
      if (grid[key]) {
        grid[key].push(slot);
      }
    }
    return grid;
  }, [slots]);

  const slotConflicts = useMemo(() => {
    const map: Record<string, Conflict[]> = {};
    for (const conflict of conflicts) {
      const slot = slots.find((s) => s.id === conflict.conflictingSlotId);
      if (slot) {
        const key = `${slot.day_of_week}-${slot.start_time}`;
        if (!map[key]) map[key] = [];
        map[key].push(conflict);
      }
    }
    return map;
  }, [conflicts, slots]);

  const handleCellClick = (day: number, time: string) => {
    const existing = gridSlots[`${day}-${time}`];
    if (existing && existing.length > 0) {
      setEditingSlot(existing[0]);
      setSlotForm({
        subject_name: existing[0].subject_name,
        teacher_id: existing[0].teacher_id || "",
        room: existing[0].room || "",
      });
    } else {
      setEditingSlot(null);
      setSlotForm({ subject_name: "", teacher_id: "", room: "" });
    }
    setSelectedDay(day);
    setSelectedTime(time);
    setShowSlotModal(true);
    setConflicts([]);
  };

  const handleSaveSlot = async () => {
    if (!slotForm.subject_name.trim()) {
      toast.error("Subject name is required");
      return;
    }

    setSaving(true);
    try {
      const endIndex = TIME_SLOTS.indexOf(selectedTime) + 1;
      const endTime = endIndex < TIME_SLOTS.length ? TIME_SLOTS[endIndex] : selectedTime;

      const payload = {
        class_id: selectedClass,
        subject_name: slotForm.subject_name.trim(),
        teacher_id: slotForm.teacher_id || null,
        room: slotForm.room.trim() || null,
        day_of_week: selectedDay,
        start_time: selectedTime,
        end_time: endTime,
        academic_year: selectedYear,
        term: selectedTerm,
        campus_id: selectedCampus || null,
      };

      if (editingSlot) {
        const data = await apiPatch<{ success: boolean; conflicts?: Conflict[] }>("/api/admin/timetable-builder", {
          id: editingSlot.id,
          ...payload,
        });
        if (data.conflicts && data.conflicts.length > 0) {
          setConflicts(data.conflicts);
          setShowConflicts(true);
          toast.warning("Conflicts detected. Review before saving.");
          return;
        }
        toast.success("Slot updated successfully");
      } else {
        const data = await apiPost<{ success: boolean; slot: TimetableSlot; conflicts?: Conflict[] }>("/api/admin/timetable-builder", payload);
        if (data.conflicts && data.conflicts.length > 0) {
          setConflicts(data.conflicts);
          setShowConflicts(true);
          toast.warning("Conflicts detected. Review before saving.");
          return;
        }
        toast.success("Slot created successfully");
      }

      setShowSlotModal(false);
      setEditingSlot(null);
      setConflicts([]);
      await fetchSlots();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!editingSlot) return;
    setSaving(true);
    try {
      await apiDelete(`/api/admin/timetable-builder?id=${editingSlot.id}`);
      toast.success("Slot deleted");
      setShowSlotModal(false);
      setEditingSlot(null);
      await fetchSlots();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    setIsPrintView(true);
    setTimeout(() => {
      window.print();
      setIsPrintView(false);
    }, 300);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bdja-dark">
        <Loader2 className="w-8 h-8 animate-spin text-bdja-secondary" />
      </div>
    );
  }

  if (user?.user_category !== "admin") return null;

  return (
    <div className={`min-h-screen bg-bdja-dark text-slate-100 ${isPrintView ? "print:bg-white print:text-black" : ""}`}>
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                <Calendar className="w-7 h-7 text-bdja-secondary" />
                Timetable Builder
              </h1>
              <p className="text-slate-400 mt-1">Visual drag-and-drop timetable with conflict detection</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-800/60 border-slate-700/50 text-slate-100 w-40"
              >
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </Select>
              <Select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="bg-slate-800/60 border-slate-700/50 text-slate-100 w-32"
              >
                {TERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
              <Select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-800/60 border-slate-700/50 text-slate-100 w-48"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.grade_level})</option>
                ))}
              </Select>
              <Button variant="outline" onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" />
                Print
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Conflicts Banner */}
        <AnimatePresence>
          {showConflicts && conflicts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Card className="border-red-500/30 bg-red-500/10">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h3 className="font-semibold text-red-300">Conflicts Detected</h3>
                    <button onClick={() => setShowConflicts(false)} className="ml-auto">
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {conflicts.map((c, i) => (
                      <p key={i} className="text-sm text-red-300">• {c.message}</p>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timetable Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-800/80">
                    <th className="px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left w-24 sticky left-0 bg-slate-800/80 z-10">
                      Time
                    </th>
                    {DAYS.map((day) => (
                      <th key={day} className="px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center min-w-[180px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {TIME_SLOTS.slice(0, -1).map((time, timeIndex) => (
                    <tr key={time} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2 text-xs text-slate-400 font-mono sticky left-0 bg-slate-900/60 z-10 border-r border-slate-800">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {time} - {TIME_SLOTS[timeIndex + 1]}
                        </div>
                      </td>
                      {DAYS.map((_, dayIndex) => {
                        const key = `${dayIndex}-${time}`;
                        const cellSlots = gridSlots[key] || [];
                        const cellConflicts = slotConflicts[key] || [];
                        const hasConflict = cellConflicts.length > 0;

                        return (
                          <td
                            key={key}
                            className={`px-2 py-1 border-l border-slate-800 min-h-[80px] align-top cursor-pointer transition-all hover:bg-slate-800/50 ${
                              hasConflict ? "bg-red-500/5" : ""
                            }`}
                            onClick={() => handleCellClick(dayIndex, time)}
                          >
                            <AnimatePresence>
                              {cellSlots.map((slot) => (
                                <motion.div
                                  key={slot.id}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className={`rounded-lg border px-2 py-1.5 mb-1 text-xs ${getSubjectColor(slot.subject_name)} ${
                                    hasConflict ? "border-red-500/50 ring-1 ring-red-500/30" : ""
                                  }`}
                                >
                                  <div className="font-semibold truncate">{slot.subject_name}</div>
                                  {slot.profiles?.full_name && (
                                    <div className="flex items-center gap-1 text-[10px] opacity-80">
                                      <User className="w-2.5 h-2.5" />
                                      {slot.profiles.full_name}
                                    </div>
                                  )}
                                  {slot.room && (
                                    <div className="flex items-center gap-1 text-[10px] opacity-80">
                                      <MapPin className="w-2.5 h-2.5" />
                                      {slot.room}
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </AnimatePresence>
                            {cellSlots.length === 0 && (
                              <div className="h-full min-h-[60px] flex items-center justify-center">
                                <Plus className="w-4 h-4 text-slate-700 opacity-0 hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Subject Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Subject Colors
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SUBJECT_COLORS).map(([subject, colorClass]) => (
              <div key={subject} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${colorClass}`}>
                <div className={`w-2 h-2 rounded-full ${colorClass.split(" ")[0].replace("bg-", "bg-").replace("/20", "")}`} />
                {subject}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Slot Modal */}
      <Modal
        isOpen={showSlotModal}
        onClose={() => { setShowSlotModal(false); setEditingSlot(null); setConflicts([]); }}
        title={editingSlot ? "Edit Slot" : "Add Slot"}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Calendar className="w-4 h-4" />
            {DAYS[selectedDay]} • {selectedTime} - {
              TIME_SLOTS[TIME_SLOTS.indexOf(selectedTime) + 1] || selectedTime
            }
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Subject Name</label>
            <Input
              value={slotForm.subject_name}
              onChange={(e) => setSlotForm({ ...slotForm, subject_name: e.target.value })}
              placeholder="e.g. Mathematics"
              className="bg-slate-800/60 border-slate-700/50 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Teacher</label>
            <Select
              value={slotForm.teacher_id}
              onChange={(e) => setSlotForm({ ...slotForm, teacher_id: e.target.value })}
              className="bg-slate-800/60 border-slate-700/50 text-slate-100"
            >
              <option value="">Select Teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name} {t.department ? `(${t.department})` : ""}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Room</label>
            <Input
              value={slotForm.room}
              onChange={(e) => setSlotForm({ ...slotForm, room: e.target.value })}
              placeholder="e.g. Room 101"
              className="bg-slate-800/60 border-slate-700/50 text-slate-100"
            />
          </div>

          {conflicts.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-300">Conflicts</span>
              </div>
              {conflicts.map((c, i) => (
                <p key={i} className="text-xs text-red-300">• {c.message}</p>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSaveSlot} isLoading={saving} className="flex-1">
              <Save className="w-4 h-4" />
              {editingSlot ? "Update" : "Create"}
            </Button>
            {editingSlot && (
              <Button variant="danger" onClick={handleDeleteSlot} isLoading={saving}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="outline" onClick={() => { setShowSlotModal(false); setEditingSlot(null); }}>
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
