"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Plus, Pencil, Trash2, GraduationCap, Key, X, CheckCircle, Search, Filter } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ADMIN_SEGMENT } from "@/lib/constants";

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  password_changed: boolean;
  students?: {
    admission_number: string;
    grade_level: string;
    class_id: string | null;
  };
}

const GRADES = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [newGrade, setNewGrade] = useState("");
  const [credentials, setCredentials] = useState<{ id: string; name: string; email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<{ students: StudentProfile[] }>("/api/admin/students");
      setStudents(data.students || []);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this student permanently? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/students?id=${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
      setStudents((prev) => prev.filter((s) => s.id !== id));
      toast.success("Student deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handlePromote = async (id: string) => {
    if (!newGrade) { toast.error("Select a new grade level"); return; }
    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, new_grade_level: newGrade }),
      });
      if (!res.ok) throw new Error("Failed to promote");
      toast.success("Student promoted successfully");
      setPromotingId(null);
      setNewGrade("");
      fetchStudents();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleGenerateCredentials = async (student: StudentProfile) => {
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_credentials",
          id: student.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate credentials");
      const data = await res.json();
      setCredentials({ id: student.id, name: student.full_name, email: student.email, tempPassword: data.tempPassword });
      toast.success("Credentials generated");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = s.full_name.toLowerCase().includes(q) || (s.students?.admission_number || "").toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    const matchesGrade = filterGrade === "all" || s.students?.grade_level === filterGrade;
    return matchesSearch && matchesGrade;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
        <p className="font-medium mb-2">Failed to load students</p>
        <p className="text-sm">{error}</p>
        <Button onClick={fetchStudents} className="mt-3" size="sm">
          <Loader2 className="w-3 h-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
          <p className="text-sm text-gray-400 mt-1">Manage student records and academic progress</p>
        </div>
        <Link href={`/${ADMIN_SEGMENT}/students/create`}>
          <Button><Plus className="w-4 h-4 mr-2" />Add Student</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
            <option value="all">All Grades</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {credentials && (
        <Card className="p-5 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-emerald-400 flex items-center gap-2"><Key className="w-4 h-4" /> Generated Credentials</h3>
              <p className="text-sm text-gray-300 mt-2"><strong>Name:</strong> {credentials.name}</p>
              <p className="text-sm text-gray-300"><strong>Email:</strong> {credentials.email}</p>
              <p className="text-sm text-gray-300"><strong>Temp Password:</strong> <span className="font-mono text-amber-400">{credentials.tempPassword}</span></p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setCredentials(null)}><X className="w-4 h-4" /></Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Admission #</th>
                <th className="px-4 py-3 text-left">Grade</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((s) => (
                <tr key={s.id} className="text-gray-300 hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-emerald-400" />
                      <span className="font-medium">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{s.students?.admission_number || "—"}</td>
                  <td className="px-4 py-3">{s.students?.grade_level || "—"}</td>
                  <td className="px-4 py-3 text-gray-400">{s.email}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs border-0 ${s.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {s.is_active ? <><CheckCircle className="w-3 h-3 mr-1" />Active</> : "Inactive"}
                    </Badge>
                    {!s.password_changed && <Badge className="bg-amber-500/10 text-amber-400 border-0 text-xs ml-1">First Login</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/${ADMIN_SEGMENT}/students/edit/${s.id}`}>
                        <Button size="sm" variant="ghost"><Pencil className="w-4 h-4" /></Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => { setPromotingId(promotingId === s.id ? null : s.id); setNewGrade(""); }}>
                        <GraduationCap className="w-4 h-4 text-amber-400" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleGenerateCredentials(s)}>
                        <Key className="w-4 h-4 text-cyan-400" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {promotingId === s.id && (
                      <div className="mt-2 flex items-center gap-2 justify-end">
                        <select value={newGrade} onChange={(e) => setNewGrade(e.target.value)} className="px-2 py-1 rounded bg-slate-800 border border-gray-700 text-white text-xs">
                          <option value="">Select grade</option>
                          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <Button size="sm" onClick={() => handlePromote(s.id)}>Promote</Button>
                        <Button size="sm" variant="outline" onClick={() => setPromotingId(null)}>Cancel</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No students found.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
