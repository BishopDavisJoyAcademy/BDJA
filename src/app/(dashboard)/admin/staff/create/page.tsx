"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2, AlertCircle, Check, Shield } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";
import { apiGet, apiPost } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

interface Permission {
  id: string; key: string; name: string; description?: string;
  permission_categories?: { name: string };
}

export default function CreateStaffPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", department: "", designation: "", campus_id: "" });

  useEffect(() => {
    apiGet("/api/admin/staff/permissions").then((d) => setPermissions(d.permissions || [])).catch((err) => toast.error("Failed to load permissions: " + getErrorMessage(err)));
  }, []);

  const togglePerm = (id: string) => {
    setSelectedPerms((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email) { toast.error("Full name and email are required"); return; }
    setLoading(true);
    try {
      await apiPost("/api/admin/staff", { ...form, permissionIds: selectedPerms });
      toast.success("Staff member created successfully");
      router.push(`/${ADMIN_SEGMENT}/staff`);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setLoading(false); }
  };

  const grouped = permissions.reduce((acc, p) => {
    const cat = p.permission_categories?.name || "General";
    if (!acc[cat]) acc[cat] = []; acc[cat].push(p); return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"><ArrowLeft className="w-4 h-4" /> Back to Staff</button>
      <div><h1 className="text-3xl font-bold text-white">Add New Staff</h1><p className="text-gray-400 mt-1">Create a new staff account with permissions</p></div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold text-white flex items-center gap-2"><Plus className="w-5 h-5 text-amber-400" /> Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name *</label><input required value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="John Doe" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Email *</label><input required type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="john@bdja.ac.ke" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Phone</label><input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="+254..." /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Department</label><input value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="e.g. Academics" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Designation</label><input value={form.designation} onChange={(e) => setForm({...form, designation: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="e.g. Teacher" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Campus ID</label><input value={form.campus_id} onChange={(e) => setForm({...form, campus_id: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" placeholder="Campus UUID" /></div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold text-white flex items-center gap-2"><Shield className="w-5 h-5 text-violet-400" /> Permissions</h3>
          <p className="text-sm text-gray-400">Select the permissions this staff member should have.</p>
          {Object.entries(grouped).map(([category, perms]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{category}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {perms.map((p) => (
                  <button key={p.id} type="button" onClick={() => togglePerm(p.id)} className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedPerms.includes(p.id) ? "bg-violet-500/10 border-violet-500/30 text-violet-300" : "bg-slate-900/30 border-slate-700/50 text-gray-400 hover:border-slate-600"}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${selectedPerms.includes(p.id) ? "bg-violet-500 border-violet-500" : "border-slate-600"}`}>{selectedPerms.includes(p.id) && <Check className="w-3 h-3 text-white" />}</div>
                    <div><p className="text-sm font-medium">{p.name}</p><p className="text-xs opacity-70">{p.description}</p></div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {permissions.length === 0 && <div className="text-center py-6 text-gray-500 text-sm"><AlertCircle className="w-5 h-5 mx-auto mb-2" />No permissions available. Check database setup.</div>}
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-xl border border-slate-600 text-gray-300 hover:bg-slate-700/50 transition-all text-sm font-medium">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{loading ? "Creating..." : "Create Staff"}</button>
        </div>
      </form>
    </div>
  );
}
