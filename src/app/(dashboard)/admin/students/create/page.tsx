"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";
import { apiPost } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

const GRADES = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];

export default function CreateStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", admission_number: "", grade_level: "Grade 1", class_id: "", campus_id: "", parent_id: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.admission_number || !form.grade_level) { toast.error("Full name, admission number, and grade level are required"); return; }
    setLoading(true);
    try {
      await apiPost("/api/admin/students", form);
      toast.success("Student created successfully");
      router.push(`/${ADMIN_SEGMENT}/students`);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"><ArrowLeft className="w-4 h-4" /> Back to Students</button>
      <div><h1 className="text-3xl font-bold text-white">Add New Student</h1><p className="text-gray-400 mt-1">Only name, admission number, and grade are required. Everything else is optional.</p></div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold text-white flex items-center gap-2"><Plus className="w-5 h-5 text-blue-400" /> Student Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name *</label><input required value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="Jane Doe" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Admission Number *</label><input required value={form.admission_number} onChange={(e) => setForm({...form, admission_number: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="BDJA-2026-001" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Grade Level *</label>
              <select required value={form.grade_level} onChange={(e) => setForm({...form, grade_level: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50">
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Email <span className="text-gray-500 font-normal">(optional)</span></label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="student@bdja.ac.ke" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Phone <span className="text-gray-500 font-normal">(optional)</span></label><input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="+254..." /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Class ID <span className="text-gray-500 font-normal">(optional)</span></label><input value={form.class_id} onChange={(e) => setForm({...form, class_id: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="Class UUID" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Campus ID <span className="text-gray-500 font-normal">(optional)</span></label><input value={form.campus_id} onChange={(e) => setForm({...form, campus_id: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="Campus UUID" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Parent ID <span className="text-gray-500 font-normal">(optional)</span></label><input value={form.parent_id} onChange={(e) => setForm({...form, parent_id: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="Parent UUID" /></div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-xl border border-slate-600 text-gray-300 hover:bg-slate-700/50 transition-all text-sm font-medium">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{loading ? "Creating..." : "Create Student"}</button>
        </div>
      </form>
    </div>
  );
}
