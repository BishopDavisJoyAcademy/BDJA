"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit, Search, AlertCircle } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";
import { apiGet, apiFetch } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

interface Student { id: string; full_name: string; email: string; is_active: boolean; students?: { admission_number: string; grade_level: string }; }

export default function StudentsListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    apiGet("/api/admin/students").then((d) => setStudents(d.students || [])).catch((err) => { setError(getErrorMessage(err)); toast.error(getErrorMessage(err)); }).finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      await apiFetch(`/api/admin/students?id=${id}`, { method: "DELETE" });
      setStudents((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !current } : s));
      toast.success(`Student ${!current ? "activated" : "deactivated"}`);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
  };

  const filtered = students.filter((s) => {
    const m = (s.full_name + s.email + (s.students?.admission_number || "") + (s.students?.grade_level || "")).toLowerCase().includes(search.toLowerCase());
    const f = filter === "all" || (filter === "active" ? s.is_active : !s.is_active);
    return m && f;
  });

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div></div>;
  if (error) return <div className="p-4 bg-red-500/10 text-red-400 rounded-xl flex items-center gap-2 border border-red-500/20"><AlertCircle className="w-5 h-5" />{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-white">Student Management</h1><p className="text-gray-400 mt-1">{students.length} students</p></div>
        <Link href={`/${ADMIN_SEGMENT}/students/create`} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/20 font-medium"><Plus className="w-4 h-4" /> Add Student</Link>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students..." className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" />
        </div>
        <div className="flex gap-2">
          {(["all","active","inactive"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filter===f ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-slate-800/50 text-gray-400 border border-slate-700 hover:border-slate-600"}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 border-b border-slate-700/50"><tr>
            <th className="text-left px-5 py-4 font-medium text-gray-400">Name</th>
            <th className="text-left px-5 py-4 font-medium text-gray-400">Admission #</th>
            <th className="text-left px-5 py-4 font-medium text-gray-400">Grade</th>
            <th className="text-left px-5 py-4 font-medium text-gray-400">Status</th>
            <th className="text-left px-5 py-4 font-medium text-gray-400">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-700/30">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-slate-700/20 transition-colors">
                <td className="px-5 py-4 font-medium text-white">{s.full_name}</td>
                <td className="px-5 py-4 text-gray-400">{s.students?.admission_number || "—"}</td>
                <td className="px-5 py-4 text-gray-400">{s.students?.grade_level || "—"}</td>
                <td className="px-5 py-4"><button onClick={() => toggleStatus(s.id, s.is_active)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${s.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>{s.is_active ? "Active" : "Inactive"}</button></td>
                <td className="px-5 py-4"><Link href={`/${ADMIN_SEGMENT}/students/edit/${s.id}`} className="p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/60 text-gray-300 hover:text-white transition-all"><Edit className="w-4 h-4" /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-gray-500"><p>No students found.</p></div>}
      </div>
    </div>
  );
}
