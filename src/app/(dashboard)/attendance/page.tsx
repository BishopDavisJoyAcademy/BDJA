"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { UserCheck, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function AttendancePage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const canEdit = user ? hasPermission(user.role, "editAttendance") : false;

  useEffect(() => {
    if (!user) return;
    loadClasses();
    loadSubjects();
  }, [user]);

  useEffect(() => {
    if (selectedClass) loadStudents();
  }, [selectedClass]);

  const loadClasses = async () => {
    const { data } = await supabase.from("classes").select("*").order("name");
    setClasses(data || []);
    if (data && data.length > 0) setSelectedClass(data[0].id);
  };

  const loadSubjects = async () => {
    const { data } = await supabase.from("subjects").select("*").order("name");
    setSubjects(data || []);
  };

  const loadStudents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("students")
      .select("*, profiles(full_name)")
      .eq("class_id", selectedClass)
      .eq("status", "active");
    setStudents(data || []);

    // Load today's attendance
    const today = new Date().toISOString().split("T")[0];
    const { data: att } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("class_id", selectedClass)
      .eq("date", today);

    const map: Record<string, string> = {};
    att?.forEach((a) => { map[a.student_id] = a.status; });
    setAttendanceMap(map);
    setLoading(false);
  };

  const markAttendance = async (studentId: string, status: string) => {
    if (!canEdit) { toast.error("No permission"); return; }

    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("attendance").upsert({
      student_id: studentId,
      class_id: selectedClass,
      subject_id: selectedSubject || null,
      date: today,
      status,
      marked_by: user?.id,
    }, { onConflict: "student_id,class_id,subject_id,date" });

    if (error) { toast.error("Failed to mark"); return; }
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
    toast.success("Attendance marked");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-bdja-dark">Attendance Register</h1>
        <p className="text-gray-500 text-sm mt-1">Mark and view student attendance</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-48">
          <option value="">Select class</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-48">
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !selectedClass ? (
        <Card><CardContent className="p-12 text-center text-gray-400">Select a class to view attendance</CardContent></Card>
      ) : students.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-400">No students in this class.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{formatDate(new Date().toISOString())} - {students.length} students</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {students.map((s) => {
                const status = attendanceMap[s.id];
                return (
                  <div key={s.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-bdja-primary rounded-full flex items-center justify-center">
                        <UserCheck className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.profiles?.full_name || s.admission_number}</p>
                        <p className="text-xs text-gray-400">{s.admission_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status && (
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                          status === "present" ? "bg-green-100 text-green-700" :
                          status === "absent" ? "bg-red-100 text-red-700" :
                          status === "late" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {status}
                        </span>
                      )}
                      {canEdit && (
                        <div className="flex gap-1">
                          <button onClick={() => markAttendance(s.id, "present")} className="p-1.5 hover:bg-green-100 rounded-lg" title="Present">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </button>
                          <button onClick={() => markAttendance(s.id, "absent")} className="p-1.5 hover:bg-red-100 rounded-lg" title="Absent">
                            <XCircle className="w-4 h-4 text-red-600" />
                          </button>
                          <button onClick={() => markAttendance(s.id, "late")} className="p-1.5 hover:bg-yellow-100 rounded-lg" title="Late">
                            <Clock className="w-4 h-4 text-yellow-600" />
                          </button>
                          <button onClick={() => markAttendance(s.id, "excused")} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Excused">
                            <AlertCircle className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
