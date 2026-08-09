"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Plus, Search, Pencil, ArrowUp, Key } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface StudentRecord {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  students?: {
    admission_number?: string;
    grade_level?: string;
  };
}

export default function StudentManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && user?.user_category !== "admin") {
      router.push("/unauthorized");
      return;
    }
    if (user?.user_category === "admin") {
      fetchStudents();
    }
  }, [user, loading, router]);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/admin/students");
      if (!res.ok) throw new Error("Failed to fetch students");
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPin = async (id: string) => {
    if (!confirm("Reset this student's PIN to 0000?")) return;
    try {
      const res = await fetch(`/api/admin/students?id=${id}&action=reset-pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to reset PIN");
      toast.success("PIN reset to 0000");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePromote = async (id: string, currentGrade: string) => {
    const grades = ["playgroup", "pp1", "pp2", "grade1", "grade2", "grade3", "grade4", "grade5", "grade6"];
    const idx = grades.indexOf(currentGrade);
    const nextGrade = idx >= 0 && idx < grades.length - 1 ? grades[idx + 1] : currentGrade;
    if (!confirm(`Promote student to ${nextGrade}?`)) return;
    try {
      const res = await fetch(`/api/admin/students?id=${id}&action=promote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade_level: nextGrade }),
      });
      if (!res.ok) throw new Error("Failed to promote");
      toast.success(`Promoted to ${nextGrade}`);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.students?.admission_number?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="text-gray-500">Manage all enrolled students</p>
        </div>
        <Link href="/admin/students/create">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Student
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search students by name, admission number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admission No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No students found
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.full_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.students?.admission_number || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">{s.students?.grade_level || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.is_active ? "success" : "secondary"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/students/edit/${s.id}`}>
                        <Button variant="ghost" size="sm" className="flex items-center gap-1">
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => handlePromote(s.id, s.students?.grade_level || "")}
                      >
                        <ArrowUp className="w-3 h-3" /> Promote
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 text-amber-600"
                        onClick={() => handleResetPin(s.id)}
                      >
                        <Key className="w-3 h-3" /> Reset PIN
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
