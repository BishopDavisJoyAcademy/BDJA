"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";
import { apiGet, apiPut } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

const GRADES = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];

export default function EditStudentPage() {
  const router = useRouter(); const params = useParams(); const id = params.id as string;
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", admission_number: "", grade_level: "", class_id: "", campus_id: "", is_active: true });

  useEffect(() => {
    apiGet(`/api/admin/students?id=${id}`).then((d) => {
      const s = d.student;
      setForm({ full_name: s.full_name, email: s.email, phone: s.phone || "", admission_number: s.students?.admission_number || "", grade_level: s.students?.grade_level || "", class_id: s.students?.class_id || "", campus_id: s.campus_id || "", is_active: s.is_active });
      setLoading(false);
    }).catch((err) => { toast.error(getErrorMessage(err)); setLoading(false); });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await apiPut(`/api/admin/students?id=${id}`, form);
      toast.success("Student updated successfully"); router.push(`/${ADMIN_SEGMENT}/students`);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"><ArrowLeft className="w-4 h-4" /> Back to Students</button>
      <h1 className="text-3xl font-bold text-white">Edit Student</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label><input required value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Admission Number</label><input required value={form.admission_number} onChange={(e) => setForm({...form, admission_number: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Grade Level</label>
              <select required value={form.grade_level} onChange={(e) => setForm({...form, grade_level: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50">{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select>
            </div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Phone</label><input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Class ID</label><input value={form.class_id} onChange={(e) => setForm({...form, class_id: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Campus ID</label><input value={form.campus_id} onChange={(e) => setForm({...form, campus_id: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
          </div>
          <label className="flex items-center gap-3 mt-4 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 rounded border-slate-600 text-amber-500 bg-slate-900 focus:ring-amber-500/20" />
            <span className="text-sm text-gray-300">Account Active</span>
          </label>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-xl border border-slate-600 text-gray-300 hover:bg-slate-700/50 transition-all text-sm font-medium">Cancel</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </form>
    </div>
  );
}
