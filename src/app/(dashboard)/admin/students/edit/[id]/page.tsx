"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const GRADE_LEVELS = [
  "playgroup", "pp1", "pp2", "grade1", "grade2", "grade3", "grade4", "grade5", "grade6"
];

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    admission_number: "",
    grade_level: "grade1",
    class_id: "",
    campus_id: "",
    parent_id: "",
    is_active: true,
  });

  useEffect(() => {
    if (!studentId) return;
    loadStudent();
  }, [studentId]);

  const loadStudent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/students?id=${studentId}`);
      if (!res.ok) throw new Error("Failed to load student");
      const data = await res.json();
      const s = data.student;
      if (!s) throw new Error("Student not found");
      setForm({
        full_name: s.full_name || "",
        admission_number: s.students?.admission_number || "",
        grade_level: s.students?.grade_level || "grade1",
        class_id: s.students?.class_id || "",
        campus_id: s.campus_id || "",
        parent_id: "",
        is_active: s.is_active ?? true,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/students?id=${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update student");
      toast.success("Student updated!");
      router.push("/admin/students");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-bdja-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/students">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Student</h1>
          <p className="text-gray-500">Update student details</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number *</label>
            <Input value={form.admission_number} onChange={(e) => setForm({ ...form, admission_number: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
            <Select value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })}>
              {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class ID</label>
            <Input value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} placeholder="UUID" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campus ID</label>
            <Input value={form.campus_id} onChange={(e) => setForm({ ...form, campus_id: e.target.value })} placeholder="UUID" />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-bdja-primary" />
            <label htmlFor="is_active" className="text-sm text-gray-700">Account Active</label>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}</Button>
          <Link href="/admin/students"><Button variant="outline" type="button">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
