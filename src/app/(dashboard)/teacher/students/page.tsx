"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, GraduationCap, Mail, Phone, Search, Loader2,
  AlertCircle, BookOpen, ChevronRight, Filter, X
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

const GOLD = "#D4AF37";

interface Student {
  id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  admission_number: string;
  status: string | null;
}

interface ClassInfo {
  id: string;
  name: string;
  grade_level: string;
}

export default function TeacherStudentsPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch teacher's classes
  useEffect(() => {
    async function fetchClasses() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
        const res = await fetch("/api/teacher/classes", { headers });
        if (!res.ok) throw new Error("Failed to fetch classes");
        const data = await res.json();
        const classList = data.classes || [];
        setClasses(classList);
        if (classList.length > 0) {
          setSelectedClass(classList[0].id);
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Could not load classes");
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, []);

  // Fetch students when class changes
  useEffect(() => {
    if (!selectedClass) return;
    async function fetchStudents() {
      setLoading(true);
      setError("");
      try {
        const { data: { session: s2 } } = await supabase.auth.getSession();
        const h2: Record<string, string> = {};
        if (s2?.access_token) h2["Authorization"] = `Bearer ${s2.access_token}`;
        const res = await fetch(`/api/teacher/students?class_id=${selectedClass}`, { headers: h2 });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to fetch students");
        }
        const data = await res.json();
        setStudents(data.students || []);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Could not load students");
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [selectedClass]);

  const filteredStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.admission_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedClassInfo = classes.find((c) => c.id === selectedClass);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">My Students</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {selectedClassInfo
              ? `${selectedClassInfo.name} — ${selectedClassInfo.grade_level}`
              : "View and manage your class students"}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
          <Users className="w-3.5 h-3.5" style={{ color: GOLD }} />
          <span>{students.length} students</span>
        </div>
      </motion.div>

      {/* Class selector */}
      {classes.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClass(cls.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedClass === cls.id
                  ? "text-slate-950"
                  : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800"
              }`}
              style={
                selectedClass === cls.id
                  ? { background: GOLD, border: `1px solid ${GOLD}` }
                  : undefined
              }
            >
              {cls.name}
            </button>
          ))}
        </motion.div>
      )}

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or admission number..."
          className="w-full pl-10 pr-10 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none transition-all"
          
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
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

      {/* Students grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : filteredStudents.length === 0 ? (
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
            {searchQuery
              ? "Try a different search term"
              : "Students will appear here once assigned to your class."}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredStudents.map((student, i) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}
                    >
                      {student.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-medium text-white text-sm">{student.full_name}</h3>
                      <p className="text-xs text-slate-500">{student.admission_number}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                      student.status === "active"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
                    }`}
                  >
                    {student.status || "Unknown"}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {student.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{student.email}</span>
                    </div>
                  )}
                  {student.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/30 flex items-center justify-between">
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider">
                    {selectedClassInfo?.name || "Class"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
