"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPut } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2, ArrowLeft, Save, GraduationCap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ADMIN_SEGMENT } from "@/lib/constants";

interface StudentProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  campus_id: string | null;
  students?: {
    admission_number: string;
    grade_level: string;
    class_id: string | null;
    status: string;
  };
}

const GRADES = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];

export default function EditStudentPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    admission_number: "",
    grade_level: "",
    class_id: "",
    campus_id: "",
    is_active: true,
  });

  useEffect(() => {
    apiGet<{ student: StudentProfile | null }>(`/api/admin/students?id=${id}`)
      .then((d) => {
        if (d.student) {
          setStudent(d.student);
          setForm({
            full_name: d.student.full_name || "",
            phone: d.student.phone || "",
            admission_number: d.student.students?.admission_number || "",
            grade_level: d.student.students?.grade_level || "",
            class_id: d.student.students?.class_id || "",
            campus_id: d.student.campus_id || "",
            is_active: d.student.is_active ?? true,
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        toast.error(getErrorMessage(err));
        setLoading(false);
      });
  }, [id]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.full_name.trim()) newErrors.full_name = "Full name is required";
    if (!form.admission_number.trim()) newErrors.admission_number = "Admission number is required";
    if (!form.grade_level) newErrors.grade_level = "Grade level is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await apiPut(`/api/admin/students?id=${id}`, form);
      toast.success("Student updated successfully");
      router.push(`/${ADMIN_SEGMENT}/students`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400 opacity-60" />
        <p className="text-gray-400 text-lg font-medium">Student not found</p>
        <p className="text-sm text-gray-500 mt-1">The student you are looking for does not exist or has been removed.</p>
        <Button onClick={() => router.push(`/${ADMIN_SEGMENT}/students`)} className="mt-4" variant="outline">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Students
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Students
      </button>

      <div>
        <h1 className="text-3xl font-bold text-white">Edit Student</h1>
        <p className="text-gray-400 mt-1">Update student information and academic details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold text-white flex items-center gap-2"><GraduationCap className="w-5 h-5 text-emerald-400" /> Student Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name <span className="text-red-400">*</span></label>
              <input
                required
                value={form.full_name}
                onChange={(e) => { setForm({ ...form, full_name: e.target.value }); setErrors((p) => ({ ...p, full_name: "" })); }}
                className={`w-full px-4 py-2.5 bg-slate-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors ${errors.full_name ? "border-red-500/50" : "border-slate-700"}`}
              />
              {errors.full_name && <p className="text-xs text-red-400 mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Admission Number <span className="text-red-400">*</span></label>
              <input
                required
                value={form.admission_number}
                onChange={(e) => { setForm({ ...form, admission_number: e.target.value }); setErrors((p) => ({ ...p, admission_number: "" })); }}
                className={`w-full px-4 py-2.5 bg-slate-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors ${errors.admission_number ? "border-red-500/50" : "border-slate-700"}`}
              />
              {errors.admission_number && <p className="text-xs text-red-400 mt-1">{errors.admission_number}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Grade Level <span className="text-red-400">*</span></label>
              <select
                required
                value={form.grade_level}
                onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">Select grade</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              {errors.grade_level && <p className="text-xs text-red-400 mt-1">{errors.grade_level}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Class ID</label>
              <input
                value={form.class_id}
                onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                placeholder="Class UUID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Campus ID</label>
              <input
                value={form.campus_id}
                onChange={(e) => setForm({ ...form, campus_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                placeholder="Campus UUID"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-900/30 rounded-xl border border-slate-700/30">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-5 h-5 rounded border-gray-600 text-emerald-400 focus:ring-emerald-500/30"
              />
              <label htmlFor="is_active" className="text-sm text-gray-300 cursor-pointer select-none">
                <span className="font-medium text-white">Active Account</span>
                <p className="text-xs text-gray-500 mt-0.5">Inactive students cannot log in</p>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-xl border border-slate-600 text-gray-300 hover:bg-slate-700/50 transition-all text-sm font-medium">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
