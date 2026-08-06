"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Search, Plus, Trash2, GraduationCap, Mail, Phone, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

interface StudentMember {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  students?: {
    admission_number?: string;
    grade_level?: string;
    status?: string;
  }[];
  parent_students?: {
    parent?: {
      full_name: string;
      email: string;
    };
  }[];
}

export default function StudentsListPage() {
  const [students, setStudents] = useState<StudentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/admin/students");
      const data = await res.json();
      if (res.ok) setStudents(data.students || []);
      else throw new Error(data.error);
    } catch (err: any) {
      toast.error(err.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this student? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/students?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setStudents((prev) => prev.filter((s) => s.id !== id));
        toast.success("Student deleted");
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = students.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.students?.[0]?.admission_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.students?.[0]?.grade_level?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-bdja-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="text-sm text-gray-500">{students.length} students enrolled</p>
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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, admission number, or grade..."
          className="pl-10"
        />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Admission #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Grade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Parent</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((member) => {
                const studentInfo = member.students?.[0];
                const parentInfo = member.parent_students?.[0]?.parent;

                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{member.full_name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {member.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                      {studentInfo?.admission_number || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                        <GraduationCap className="w-3 h-3" />
                        {studentInfo?.grade_level?.toUpperCase() || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {parentInfo ? (
                        <div>
                          <p className="font-medium">{parentInfo.full_name}</p>
                          <p className="text-gray-500">{parentInfo.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">No parent linked</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          member.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(member.id)}
                        disabled={deleting === member.id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        {deleting === member.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No students found.</p>
            <Link href="/admin/students/create" className="text-bdja-primary hover:underline text-sm mt-2 inline-block">
              Create your first student
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
