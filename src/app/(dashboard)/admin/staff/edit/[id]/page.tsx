"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, Check, Shield } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";
import { apiGet, apiPut } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

interface Permission { id: string; key: string; name: string; description?: string; permission_categories?: { name: string }; }
interface StaffMember { id: string; full_name: string; email: string; phone?: string; campus_id?: string; is_active: boolean; staff?: { department: string; designation: string }; }

export default function EditStaffPage() {
  const router = useRouter(); const params = useParams(); const id = params.id as string;
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]); const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [form, setForm] = useState<Partial<StaffMember>>({});

  useEffect(() => {
    Promise.all([apiGet(`/api/admin/staff?id=${id}`), apiGet("/api/admin/staff/permissions")])
      .then(([staffData, permsData]) => {
        const s = staffData.staff;
        setForm({ full_name: s.full_name, email: s.email, phone: s.phone, campus_id: s.campus_id, is_active: s.is_active, staff: s.staff });
        setPermissions(permsData.permissions || []); setLoading(false);
      }).catch((err) => { toast.error(getErrorMessage(err)); setLoading(false); });
  }, [id]);

  const togglePerm = (pid: string) => { setSelectedPerms((prev) => prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await apiPut(`/api/admin/staff?id=${id}`, { full_name: form.full_name, email: form.email, phone: form.phone, campus_id: form.campus_id, is_active: form.is_active, department: form.staff?.department, designation: form.staff?.designation, permissionIds: selectedPerms });
      toast.success("Staff updated successfully"); router.push(`/${ADMIN_SEGMENT}/staff`);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setSaving(false); }
  };

  const grouped = permissions.reduce((acc, p) => { const cat = p.permission_categories?.name || "General"; if (!acc[cat]) acc[cat] = []; acc[cat].push(p); return acc; }, {} as Record<string, Permission[]>);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"><ArrowLeft className="w-4 h-4" /> Back to Staff</button>
      <h1 className="text-3xl font-bold text-white">Edit Staff</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold text-white">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label><input required value={form.full_name || ""} onChange={(e) => setForm({...form, full_name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label><input required type="email" value={form.email || ""} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Phone</label><input value={form.phone || ""} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Department</label><input value={form.staff?.department || ""} onChange={(e) => setForm({...form, staff: {...form.staff, department: e.target.value}})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Designation</label><input value={form.staff?.designation || ""} onChange={(e) => setForm({...form, staff: {...form.staff, designation: e.target.value}})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Campus ID</label><input value={form.campus_id || ""} onChange={(e) => setForm({...form, campus_id: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
          </div>
          <label className="flex items-center gap-3 mt-4 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 rounded border-slate-600 text-amber-500 bg-slate-900 focus:ring-amber-500/20" />
            <span className="text-sm text-gray-300">Account Active</span>
          </label>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold text-white flex items-center gap-2"><Shield className="w-5 h-5 text-violet-400" /> Permissions</h3>
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
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-xl border border-slate-600 text-gray-300 hover:bg-slate-700/50 transition-all text-sm font-medium">Cancel</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </form>
    </div>
  );
}
