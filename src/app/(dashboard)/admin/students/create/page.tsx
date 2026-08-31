"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2, GraduationCap, Copy, Check, X, Shield, Key, Hash } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";
import { apiPost } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const GRADES = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];

interface CreatedCredentials {
  admissionNumber: string;
  tempPassword: string;
}

export default function CreateStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    admission_number: "",
    grade_level: "Grade 1",
    class_id: "",
    campus_id: "",
    parent_id: "",
  });
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    setLoading(true);
    setCredentials(null);
    try {
      const data = await apiPost<{
        success: boolean;
        credentials: CreatedCredentials;
        student: { id: string; full_name: string };
        message: string;
      }>("/api/admin/students", { ...form, action: "create" });

      setCredentials(data.credentials);
      toast.success(data.message || "Student created successfully");
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!credentials) return;
    const text = `BDJA Student Account\n\nAdmission Number: ${credentials.admissionNumber}\nTemporary PIN: ${credentials.tempPassword}\n\nPlease log in and change your PIN immediately.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Students
      </button>

      <div>
        <h1 className="text-3xl font-bold text-white">Add New Student</h1>
        <p className="text-gray-400 mt-1">Create a new student record. Students log in with their admission number and PIN.</p>
      </div>

      {/* Credentials Success Banner */}
      {credentials && (
        <Card className="p-5 border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <Button size="sm" variant="ghost" onClick={() => setCredentials(null)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"><Shield className="w-5 h-5" /></div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-400 flex items-center gap-2"><Key className="w-4 h-4" /> Student Created — Save These Credentials</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/50">
                  <p className="text-xs text-gray-500 mb-1">Admission Number</p>
                  <p className="text-sm text-white font-mono tracking-wide font-medium">{credentials.admissionNumber}</p>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-lg border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 mb-1">Temporary PIN</p>
                  <p className="text-sm text-white font-mono tracking-wide">{credentials.tempPassword}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={handleCopy} className="border-slate-600 text-gray-300 hover:bg-slate-700">
                  {copied ? <><Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setCredentials(null); router.push(`/${ADMIN_SEGMENT}/students`); }} className="border-slate-600 text-gray-300 hover:bg-slate-700">
                  Done — Go to List
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

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
                placeholder="Jane Doe"
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
                placeholder="BDJA-2026-001"
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
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone <span className="text-gray-500 font-normal">(optional)</span></label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                placeholder="+254..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Class ID <span className="text-gray-500 font-normal">(optional)</span></label>
              <input
                value={form.class_id}
                onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                placeholder="Class UUID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Campus ID <span className="text-gray-500 font-normal">(optional)</span></label>
              <input
                value={form.campus_id}
                onChange={(e) => setForm({ ...form, campus_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                placeholder="Campus UUID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Parent ID <span className="text-gray-500 font-normal">(optional)</span></label>
              <input
                value={form.parent_id}
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                placeholder="Parent UUID"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-xl border border-slate-600 text-gray-300 hover:bg-slate-700/50 transition-all text-sm font-medium">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? "Creating..." : "Create Student"}
          </button>
        </div>
      </form>
    </div>
  );
}
