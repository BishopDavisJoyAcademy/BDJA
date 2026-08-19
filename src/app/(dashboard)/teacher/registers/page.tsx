"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ClipboardList, CheckCircle, XCircle, Clock, AlertTriangle, Loader2, Save, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";

interface ClassItem {
  id: string;
  name: string;
  grade_level: string;
  stream: string | null;
}

interface StudentItem {
  id: string;
  full_name: string;
  admission_number: string | null;
}

interface AttendanceRecord {
  student_id: string;
  status: "present" | "absent" | "late" | "excused";
  notes: string;
}

export default function AttendanceRegisters() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingClasses, setFetchingClasses] = useState(true);
  const [existingAttendance, setExistingAttendance] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && user?.user_category !== "staff" && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.user_category === "staff" || user?.user_category === "admin") {
      fetchTeacherClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsForClass(selectedClass);
    } else {
      setStudents([]);
      setAttendance({});
      setExistingAttendance({});
    }
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass || !date) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/attendance?class_id=${selectedClass}&date=${date}`);
        if (!res.ok) throw new Error("Failed to fetch existing attendance");
        const data = await res.json();
        if (cancelled) return;
        const existing: Record<string, string> = {};
        (data.attendance || []).forEach((a: any) => {
          existing[a.student_id] = a.id;
        });
        setExistingAttendance(existing);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedClass, date]);

  async function fetchTeacherClasses() {
    try {
      setFetchingClasses(true);
      const res = await fetch("/api/teacher/classes");
      if (!res.ok) throw new Error("Failed to fetch classes");
      const data = await res.json();
      setClasses(data.classes || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load your classes");
    } finally {
      setFetchingClasses(false);
    }
  }

  async function fetchStudentsForClass(classId: string) {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/teacher/students?class_id=${classId}`);
      if (!res.ok) throw new Error("Failed to fetch students");
      const data = await res.json();
      setStudents(data.students || []);
      // Initialize attendance entries
      const initial: Record<string, AttendanceRecord> = {};
      (data.students || []).forEach((s: StudentItem) => {
        initial[s.id] = {
          student_id: s.id,
          status: "present",
          notes: "",
        };
      });
      setAttendance(initial);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load students");
    } finally {
      setIsLoading(false);
    }
  }


  function updateAttendance(studentId: string, status: "present" | "absent" | "late" | "excused") {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  }

  function updateNotes(studentId: string, notes: string) {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
  }

  async function saveAttendance() {
    if (!selectedClass) {
      toast.error("Please select a class");
      return;
    }

    setSaving(true);
    const entries = Object.values(attendance);
    if (entries.length === 0) {
      toast.error("No students to mark");
      setSaving(false);
      return;
    }

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
        // If already exists for this student on this date, update instead
        const existingId = existingAttendance[entry.student_id];
        let res;
        if (existingId) {
          res = await fetch(`/api/attendance?id=${existingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: entry.status, notes: entry.notes || null }),
          });
        } else {
          res = await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
      fetchExistingAttendance();
    }
  }

  const statusConfig = {
    present: { label: "Present", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
    absent: { label: "Absent", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
    late: { label: "Late", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
    excused: { label: "Excused", color: "bg-blue-100 text-blue-700 border-blue-200", icon: AlertTriangle },
  };

  if (loading || fetchingClasses) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-bdja-primary animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "staff" && user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Registers</h1>
        <p className="text-gray-500">Mark and view student attendance</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-5 h-5 text-bdja-primary" />
          <span className="font-medium">Daily Attendance</span>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mb-6">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Class *</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.stream ? `(${c.stream})` : ""} — {c.grade_level}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Date *</label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={saveAttendance}
              disabled={saving || !selectedClass}
              className="w-full px-4 py-2 bg-bdja-primary text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Attendance
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : students.length === 0 && selectedClass ? (
          <div className="text-center py-8 text-gray-400 flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" /> No students found in this class.
          </div>
        ) : students.length > 0 ? (
          <div className="space-y-2">
            {students.map((s) => {
              const record = attendance[s.id];
              const status = record?.status || "present";
              const config = statusConfig[status];
              const StatusIcon = config.icon;
              const isExisting = !!existingAttendance[s.id];

              return (
                <div
                  key={s.id}
                  className={`flex items-center justify-between p-3 border rounded-lg transition-all ${isExisting ? "border-bdja-primary/30 bg-blue-50/30" : "border-gray-100 hover:bg-gray-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${config.color}`}>
                      {s.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{s.full_name}</div>
                      {s.admission_number && <div className="text-xs text-gray-400">{s.admission_number}</div>}
                    </div>
                    {isExisting && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Saved</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((key) => {
                        const cfg = statusConfig[key];
                        const Icon = cfg.icon;
                        return (
                          <button
                            key={key}
                            onClick={() => updateAttendance(s.id, key)}
                            className={`p-1.5 rounded-md text-xs transition-all ${status === key ? cfg.color + " ring-1 ring-offset-1" : "text-gray-400 hover:bg-gray-100"}`}
                            title={cfg.label}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={record?.notes || ""}
                      onChange={(e) => updateNotes(s.id, e.target.value)}
                      placeholder="Notes"
                      className="w-32 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-bdja-primary"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Select a class to begin marking attendance.
          </div>
        )}
      </Card>
    </div>
  );
}
