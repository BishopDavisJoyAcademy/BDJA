"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2, Plus, Pencil } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  students?: {
    admission_number: string;
    grade_level: string;
  };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ students: StudentProfile[] }>("/api/admin/students")
      .then((d) => setStudents(d.students || []))
      .catch((err) => { setError(getErrorMessage(err)); toast.error(getErrorMessage(err)); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;
  if (error) return <div className="p-4 bg-red-500/10 text-red-400 rounded-xl">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Students</h1>
        <Link href="/admin/students/create">
          <Button><Plus className="w-4 h-4 mr-2" />Add Student</Button>
        </Link>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Admission #</th>
              <th className="px-4 py-3 text-left">Grade</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {students.map((s) => (
              <tr key={s.id} className="text-gray-300">
                <td className="px-4 py-3">{s.full_name}</td>
                <td className="px-4 py-3">{s.students?.admission_number || "-"}</td>
                <td className="px-4 py-3">{s.students?.grade_level || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${s.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/students/edit/${s.id}`} className="text-amber-400 hover:text-amber-300">
                    <Pencil className="w-4 h-4 inline" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
