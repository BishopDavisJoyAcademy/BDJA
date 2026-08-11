"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PenLine, Save, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

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
  admission_number: string | null;
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

export default function MarkSheets() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [term, setTerm] = useState("Term 1");
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [marks, setMarks] = useState<Record<string, MarkEntry>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingClasses, setFetchingClasses] = useState(true);

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
      fetchSubjectsForClass(selectedClass);
      fetchStudentsForClass(selectedClass);
    } else {
      setSubjects([]);
      setStudents([]);
      setMarks({});
    }
  }, [selectedClass]);

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

  async function fetchSubjectsForClass(classId: string) {
    try {
      const res = await fetch(`/api/teacher/subjects?class_id=${classId}`);
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load subjects");
    }
  }

  async function fetchStudentsForClass(classId: string) {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/teacher/students?class_id=${classId}`);
      if (!res.ok) throw new Error("Failed to fetch students");
      const data = await res.json();
      setStudents(data.students || []);
      // Initialize marks entries
      const initialMarks: Record<string, MarkEntry> = {};
      (data.students || []).forEach((s: StudentItem) => {
        initialMarks[s.id] = {
          student_id: s.id,
          score: "",
          max_score: "100",
          performance_level: "meeting",
          strand: "",
          sub_strand: "",
          specific_learning_outcome: "",
        };
      });
      setMarks(initialMarks);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load students");
    } finally {
      setIsLoading(false);
    }
  }

  function updateMark(studentId: string, field: keyof MarkEntry, value: string) {
    setMarks((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  }

  async function saveMarks() {
    if (!selectedClass || !selectedSubject) {
      toast.error("Please select a class and subject");
      return;
    }

    setSaving(true);
    const entries = Object.values(marks).filter((m) => m.score !== "");
    if (entries.length === 0) {
      toast.error("No marks to save");
      setSaving(false);
      return;
    }

    const errors: string[] = [];
    const saved: string[] = [];

    for (const entry of entries) {
      const payload = {
        student_id: entry.student_id,
        subject_id: selectedSubject,
        class_id: selectedClass,
        term,
        academic_year: academicYear,
        score: entry.score ? parseFloat(entry.score) : null,
        max_score: entry.max_score ? parseFloat(entry.max_score) : null,
        performance_level: entry.performance_level,
        strand: entry.strand || "General",
        sub_strand: entry.sub_strand || "General",
        specific_learning_outcome: entry.specific_learning_outcome || null,
      };

      try {
        const res = await fetch("/api/grades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
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
      toast.error(`Saved ${saved.length} of ${entries.length} marks. ${errors.length} failed.`);
    } else {
      toast.success(`All ${saved.length} marks saved successfully!`);
    }
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Mark Sheets</h1>
        <p className="text-gray-500">Enter and manage student grades</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <PenLine className="w-5 h-5 text-bdja-primary" />
          <span className="font-medium">Grade Entry</span>
        </div>

        <div className="grid md:grid-cols-4 gap-3 mb-6">
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
            <label className="text-xs font-medium text-gray-600 block mb-1">Subject *</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedClass}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm disabled:opacity-50"
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Term</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
            >
              <option>Term 1</option>
              <option>Term 2</option>
              <option>Term 3</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Academic Year</label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : students.length === 0 && selectedClass ? (
          <div className="text-center py-8 text-gray-400 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" /> No students found in this class.
          </div>
        ) : students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Student</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600 w-20">Score</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600 w-20">Max</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600 w-32">Level</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Strand</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Sub-Strand</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="font-medium text-gray-900">{s.full_name}</div>
                      {s.admission_number && <div className="text-xs text-gray-400">{s.admission_number}</div>}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        value={marks[s.id]?.score || ""}
                        onChange={(e) => updateMark(s.id, "score", e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-bdja-primary"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="1"
                        value={marks[s.id]?.max_score || ""}
                        onChange={(e) => updateMark(s.id, "max_score", e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-bdja-primary"
                        placeholder="100"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={marks[s.id]?.performance_level || "meeting"}
                        onChange={(e) => updateMark(s.id, "performance_level", e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-bdja-primary"
                      >
                        <option value="exceeding">Exceeding</option>
                        <option value="meeting">Meeting</option>
                        <option value="approaching">Approaching</option>
                        <option value="below">Below</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={marks[s.id]?.strand || ""}
                        onChange={(e) => updateMark(s.id, "strand", e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-bdja-primary"
                        placeholder="Strand"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={marks[s.id]?.sub_strand || ""}
                        onChange={(e) => updateMark(s.id, "sub_strand", e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-bdja-primary"
                        placeholder="Sub-strand"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={marks[s.id]?.specific_learning_outcome || ""}
                        onChange={(e) => updateMark(s.id, "specific_learning_outcome", e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-bdja-primary"
                        placeholder="Outcome"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={saveMarks}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Marks
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" /> Select a class to begin entering grades.
          </div>
        )}
      </Card>
    </div>
  );
}
