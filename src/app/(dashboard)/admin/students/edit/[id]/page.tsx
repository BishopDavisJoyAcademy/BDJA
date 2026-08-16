"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  students?: {
    admission_number: string;
    grade_level: string;
    class_id: string | null;
  };
}

export default function EditStudentPage() {
  const params = useParams();
  const id = params.id as string;
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<{ student: StudentProfile | null }>(`/api/admin/students?id=${id}`)
      .then((d) => { setStudent(d.student); setLoading(false); })
      .catch((err) => { toast.error(getErrorMessage(err)); setLoading(false); });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData);
    try {
      const res = await fetch(`/api/admin/students?id=${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to update student");
      toast.success("Student updated successfully");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;
  if (!student) return <div className="text-gray-400 text-center py-12">Student not found.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Edit Student</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
          <Input name="full_name" defaultValue={student.full_name} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <Input name="email" type="email" defaultValue={student.email} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Admission Number</label>
          <Input name="admission_number" defaultValue={student.students?.admission_number || ""} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Grade Level</label>
          <Input name="grade_level" defaultValue={student.students?.grade_level || ""} required />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
