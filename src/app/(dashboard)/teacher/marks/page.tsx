"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Award, Save, Loader2, AlertCircle, CheckCircle2, PenLine,
  GraduationCap, BookOpen, Calendar, Users, TrendingUp,
  ChevronDown, XCircle, Sparkles, BarChart3, ArrowUpRight,
  ArrowDownRight, Minus, Zap, Search, Filter,
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

interface SubjectItem {
  id: string;
  name: string;
  code: string | null;
}

interface StudentItem {
  id: string;
  full_name: string;
  admission_number: string;
  avatar_url: string | null;
}

interface MarkEntry {
  student_id: string;
  score: string;
  max_score: string;
  performance_level: "exceeding" | "meeting" | "approaching" | "below";
  strand: string;
  sub_strand: string;
  specific_learning_outcome: string;
}

interface ExistingGrade {
  id: string;
  student_id: string;
  score: number | null;
  max_score: number | null;
  performance_level: string;
  strand: string;
  sub_strand: string;
  specific_learning_outcome: string | null;
}

const PERFORMANCE_LEVELS: Record<string, { label: string; color: string; bg: string; border: string; threshold: number }> = {
  exceeding: { label: "Exceeding", color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", threshold: 80 },
  meeting: { label: "Meeting", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", threshold: 60 },
  approaching: { label: "Approaching", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", threshold: 40 },
  below: { label: "Below", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", threshold: 0 },
};

const TERMS = ["Term 1", "Term 2", "Term 3"];
const ACADEMIC_YEARS = ["2024/2025", "2025/2026", "2026/2027"];
const STRANDS = ["Literacy", "Numeracy", "Science", "Social Studies", "Creative Arts", "Physical Education", "Religious Education", "Life Skills", "General"];
const SUB_STRANDS: Record<string, string[]> = {
  Literacy: ["Reading", "Writing", "Speaking", "Listening", "Phonics", "Comprehension"],
  Numeracy: ["Number Sense", "Operations", "Measurement", "Geometry", "Data Handling", "Algebra"],
  Science: ["Living Things", "Matter", "Energy", "Earth & Space", "Scientific Inquiry"],
  "Social Studies": ["Community", "Culture", "Governance", "Environment", "History"],
  "Creative Arts": ["Music", "Art & Craft", "Drama", "Dance"],
  "Physical Education": ["Gymnastics", "Games", "Swimming", "Athletics"],
  "Religious Education": ["Christian", "Islamic", "Hindu", "Moral Education"],
  "Life Skills": ["Health", "Safety", "Hygiene", "Nutrition", "Etiquette"],
  General: ["General"],
};

function calculatePerformanceLevel(score: number, maxScore: number): "exceeding" | "meeting" | "approaching" | "below" {
  if (maxScore <= 0) return "below";
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return "exceeding";
  if (pct >= 60) return "meeting";
  if (pct >= 40) return "approaching";
  return "below";
}

export default function TeacherMarksPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [existingGrades, setExistingGrades] = useState<Record<string, ExistingGrade>>({});
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [term, setTerm] = useState("Term 1");
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [marks, setMarks] = useState<Record<string, MarkEntry>>({});
  const [globalMaxScore, setGlobalMaxScore] = useState("100");
  const [selectedStrand, setSelectedStrand] = useState("General");
  const [selectedSubStrand, setSelectedSubStrand] = useState("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveProgress, setSaveProgress] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

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
      if (list.length > 0) {
        setSelectedClass(list[0].id);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Could not load classes");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  // Fetch subjects for selected class
  const fetchSubjects = useCallback(async (classId: string) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/teacher/subjects?class_id=${classId}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const data = await res.json();
      const teacherSubjects = data.subjects || [];
      setSubjects(teacherSubjects);
      if (teacherSubjects.length > 0) {
        setSelectedSubject(teacherSubjects[0].id);
      } else {
        setSelectedSubject("");
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Could not load subjects");
    }
  }, [getHeaders]);

  // Fetch students + existing grades
  const fetchStudentsAndGrades = useCallback(async (classId: string, subjectId: string, termVal: string, yearVal: string, maxScoreOverride?: string) => {
    if (!classId || !subjectId) return;
    setFetchingStudents(true);
    setError("");
    try {
      const headers = await getHeaders();

      // Fetch students
      const studentsRes = await fetch(`/api/teacher/students?class_id=${classId}`, { headers });
      if (!studentsRes.ok) throw new Error("Failed to fetch students");
      const studentsData = await studentsRes.json();
      const studentList: StudentItem[] = studentsData.students || [];
      setStudents(studentList);

      // Fetch existing grades for this class/subject/term/year
      const gradesRes = await fetch(
        `/api/grades?class_id=${classId}&subject_id=${subjectId}&term=${encodeURIComponent(termVal)}&year=${encodeURIComponent(yearVal)}`,
        { headers }
      );
      const gradesData = gradesRes.ok ? await gradesRes.json() : { grades: [] };
      const existing: Record<string, ExistingGrade> = {};
      (gradesData.grades || []).forEach((g: ExistingGrade) => {
        existing[g.student_id] = g;
      });
      setExistingGrades(existing);

      // Initialize marks from existing or defaults
      const initialMarks: Record<string, MarkEntry> = {};
      studentList.forEach((s) => {
        const eg = existing[s.id];
        initialMarks[s.id] = {
          student_id: s.id,
          score: eg?.score != null ? String(eg.score) : "",
          max_score: eg?.max_score != null ? String(eg.max_score) : (maxScoreOverride || globalMaxScore),
          performance_level: (eg?.performance_level as MarkEntry["performance_level"]) || "meeting",
          strand: eg?.strand || selectedStrand,
          sub_strand: eg?.sub_strand || selectedSubStrand,
          specific_learning_outcome: eg?.specific_learning_outcome || "",
        };
      });
      setMarks(initialMarks);
      setUnsavedChanges(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load students");
      toast.error(getErrorMessage(err) || "Could not load students");
    } finally {
      setFetchingStudents(false);
      setLoading(false);
    }
  }, [getHeaders]);

  // Initial load
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Load subjects when class changes
  useEffect(() => {
    if (selectedClass) {
      fetchSubjects(selectedClass);
    } else {
      setSubjects([]);
    }
  }, [selectedClass, fetchSubjects]);

  // Load students when class/subject/term/year changes
  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchStudentsAndGrades(selectedClass, selectedSubject, term, academicYear, globalMaxScore);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedSubject, term, academicYear]);

  // Update mark field
  const updateMark = useCallback((studentId: string, field: keyof MarkEntry, value: string) => {
    setMarks((prev) => {
      const current = prev[studentId];
      if (!current) return prev;
      const updated = { ...current, [field]: value };
      // Auto-calculate performance level when score or max_score changes
      if (field === "score" || field === "max_score") {
        const score = parseFloat(updated.score);
        const max = parseFloat(updated.max_score);
        if (!isNaN(score) && !isNaN(max) && max > 0) {
          updated.performance_level = calculatePerformanceLevel(score, max);
        }
      }
      return { ...prev, [studentId]: updated };
    });
    setUnsavedChanges(true);
  }, []);

  // Apply global max score to all
  const applyGlobalMaxScore = useCallback(() => {
    const max = parseFloat(globalMaxScore);
    if (isNaN(max) || max <= 0) {
      toast.error("Please enter a valid max score");
      return;
    }
    setMarks((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((sid) => {
        updated[sid] = { ...updated[sid], max_score: String(max) };
        const score = parseFloat(updated[sid].score);
        if (!isNaN(score)) {
          updated[sid].performance_level = calculatePerformanceLevel(score, max);
        }
      });
      return updated;
    });
    setUnsavedChanges(true);
    toast.success(`Max score set to ${max} for all students`);
  }, [globalMaxScore]);

  // Apply strand/sub-strand to all
  const applyStrandToAll = useCallback(() => {
    setMarks((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((sid) => {
        updated[sid] = { ...updated[sid], strand: selectedStrand, sub_strand: selectedSubStrand };
      });
      return updated;
    });
    setUnsavedChanges(true);
    toast.success(`Strand applied to all students`);
  }, [selectedStrand, selectedSubStrand]);

  // Save marks
  const saveMarks = useCallback(async () => {
    if (!selectedClass || !selectedSubject) {
      toast.error("Please select a class and subject");
      return;
    }
    const entries = Object.values(marks).filter((m) => m.score !== "");
    if (entries.length === 0) {
      toast.error("No marks to save");
      return;
    }

    setSaving(true);
    setSaveProgress(0);
    const headers = await getHeaders();
    headers["Content-Type"] = "application/json";
    const errors: string[] = [];
    const saved: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const score = parseFloat(entry.score);
      const maxScore = parseFloat(entry.max_score);

      const payload = {
        student_id: entry.student_id,
        subject_id: selectedSubject,
        class_id: selectedClass,
        term,
        academic_year: academicYear,
        score: !isNaN(score) ? score : null,
        max_score: !isNaN(maxScore) && maxScore > 0 ? maxScore : null,
        performance_level: entry.performance_level,
        strand: entry.strand || "General",
        sub_strand: entry.sub_strand || "General",
        specific_learning_outcome: entry.specific_learning_outcome || null,
      };

      try {
        const existing = existingGrades[entry.student_id];
        let res;
        if (existing) {
          res = await fetch(`/api/grades?id=${existing.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch("/api/grades", {
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
      setSaveProgress(Math.round(((i + 1) / entries.length) * 100));
    }

    setSaving(false);
    if (errors.length > 0) {
      toast.error(`Saved ${saved.length} of ${entries.length} marks. ${errors.length} failed.`);
    } else {
      toast.success(`All ${saved.length} marks saved successfully!`);
      setUnsavedChanges(false);
      // Refresh existing grades
      fetchStudentsAndGrades(selectedClass, selectedSubject, term, academicYear);
    }
  }, [marks, selectedClass, selectedSubject, term, academicYear, existingGrades, getHeaders, fetchStudentsAndGrades]);

  // Stats
  const stats = useMemo(() => {
    const entries = Object.values(marks).filter((m) => m.score !== "");
    if (entries.length === 0) return { count: 0, avg: 0, highest: 0, lowest: 0 };
    const scores = entries.map((m) => {
      const s = parseFloat(m.score);
      const max = parseFloat(m.max_score) || 100;
      return !isNaN(s) ? (s / max) * 100 : 0;
    });
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return {
      count: entries.length,
      avg: Math.round(avg),
      highest: Math.round(Math.max(...scores)),
      lowest: Math.round(Math.min(...scores)),
    };
  }, [marks]);

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
  const selectedSubjectInfo = subjects.find((s) => s.id === selectedSubject);

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
          <h1 className="text-2xl font-semibold text-white">Mark Sheets</h1>
          <p className="text-sm text-slate-400 mt-1">Enter and manage student grades with precision</p>
        </div>
        {unsavedChanges && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30"
          >
            Unsaved Changes
          </motion.span>
        )}
      </motion.div>

      {/* Filters Bar */}
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
              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
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

          {/* Subject */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Subject *</label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!selectedClass || subjects.length === 0}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 appearance-none disabled:opacity-40"
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Term */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Term</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 appearance-none"
              >
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Academic Year */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Academic Year</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 appearance-none"
              >
                {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Strand / Sub-strand / Max Score Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-700/30">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Strand</label>
            <div className="relative">
              <select
                value={selectedStrand}
                onChange={(e) => {
                  setSelectedStrand(e.target.value);
                  setSelectedSubStrand(SUB_STRANDS[e.target.value]?.[0] || "General");
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 appearance-none"
              >
                {STRANDS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Sub-Strand</label>
            <div className="relative">
              <select
                value={selectedSubStrand}
                onChange={(e) => setSelectedSubStrand(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 appearance-none"
              >
                {(SUB_STRANDS[selectedStrand] || ["General"]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1.5">Global Max Score</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={globalMaxScore}
                onChange={(e) => setGlobalMaxScore(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                min="1"
              />
              <button
                onClick={applyGlobalMaxScore}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-950 transition-all hover:opacity-90"
                style={{ background: GOLD }}
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={applyStrandToAll}
              disabled={!selectedClass || !selectedSubject}
              className="w-full px-4 py-2 rounded-xl text-xs font-medium border border-slate-700/50 text-slate-300 hover:bg-slate-800/50 transition-all disabled:opacity-40"
            >
              Apply Strand to All
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Bar */}
      {stats.count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { label: "Entries", value: `${stats.count}/${students.length}`, icon: PenLine, color: GOLD },
            { label: "Class Average", value: `${stats.avg}%`, icon: BarChart3, color: stats.avg >= 60 ? "#22c55e" : stats.avg >= 40 ? "#f59e0b" : "#ef4444" },
            { label: "Highest", value: `${stats.highest}%`, icon: ArrowUpRight, color: "#22c55e" },
            { label: "Lowest", value: `${stats.lowest}%`, icon: ArrowDownRight, color: "#ef4444" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.03 }}
              className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{s.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

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

      {/* Search + Save Bar */}
      {selectedClass && selectedSubject && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
            onClick={saveMarks}
            disabled={saving || students.length === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-950 transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            style={{ background: GOLD }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? `Saving ${saveProgress}%` : "Save All Marks"}
          </button>
        </motion.div>
      )}

      {/* Students Table */}
      {fetchingStudents ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : selectedClass && selectedSubject && filteredStudents.length === 0 ? (
        <motion.div
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
      ) : selectedClass && selectedSubject ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 font-medium text-slate-400 text-[11px] uppercase tracking-wider">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-400 text-[11px] uppercase tracking-wider w-24">Score</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-400 text-[11px] uppercase tracking-wider w-24">Max</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-400 text-[11px] uppercase tracking-wider">Performance</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-400 text-[11px] uppercase tracking-wider w-32">Strand</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-400 text-[11px] uppercase tracking-wider w-32">Sub-Strand</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-400 text-[11px] uppercase tracking-wider">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                <AnimatePresence>
                  {filteredStudents.map((student, i) => {
                    const mark = marks[student.id];
                    const perf = mark ? PERFORMANCE_LEVELS[mark.performance_level] : PERFORMANCE_LEVELS.meeting;
                    const hasExisting = !!existingGrades[student.id];
                    const scoreNum = parseFloat(mark?.score || "");
                    const maxNum = parseFloat(mark?.max_score || "");
                    const pct = !isNaN(scoreNum) && !isNaN(maxNum) && maxNum > 0 ? Math.round((scoreNum / maxNum) * 100) : null;

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
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            value={mark?.score || ""}
                            onChange={(e) => updateMark(student.id, "score", e.target.value)}
                            className="w-20 px-2 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                            min="0"
                            placeholder="—"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            value={mark?.max_score || ""}
                            onChange={(e) => updateMark(student.id, "max_score", e.target.value)}
                            className="w-20 px-2 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                            min="1"
                            placeholder="100"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border"
                              style={{
                                background: perf.bg,
                                color: perf.color,
                                borderColor: perf.border,
                              }}
                            >
                              {perf.label}
                            </span>
                            {pct !== null && (
                              <span className="text-[10px] text-slate-500">{pct}%</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={mark?.strand || "General"}
                            onChange={(e) => updateMark(student.id, "strand", e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-white focus:outline-none appearance-none"
                          >
                            {STRANDS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={mark?.sub_strand || "General"}
                            onChange={(e) => updateMark(student.id, "sub_strand", e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-white focus:outline-none appearance-none"
                          >
                            {(SUB_STRANDS[mark?.strand || "General"] || ["General"]).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={mark?.specific_learning_outcome || ""}
                            onChange={(e) => updateMark(student.id, "specific_learning_outcome", e.target.value)}
                            placeholder="Learning outcome..."
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                          />
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-slate-900/50 border border-slate-700/50 rounded-2xl"
        >
          <Award className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white">Select a Class and Subject</h3>
          <p className="text-slate-500 text-sm mt-1">Choose a class and subject above to start entering marks.</p>
        </motion.div>
      )}
    </div>
  );
}
