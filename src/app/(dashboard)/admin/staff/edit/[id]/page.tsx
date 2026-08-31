"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPut } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2, ArrowLeft, Save, Users, Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ADMIN_SEGMENT } from "@/lib/constants";

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  campus_id: string | null;
  staff?: {
    department: string;
    designation: string;
    employee_id: string;
  };
  permissions?: Array<{
    id: string;
    key: string;
    name: string;
    category: string;
  }>;
}

interface Permission {
  id: string;
  key: string;
  name: string;
  category: string;
}

export default function EditStaffPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    campus_id: "",
    is_active: true,
  });

  useEffect(() => {
    Promise.all([
      apiGet<{ staff: StaffMember | null }>(`/api/admin/staff?id=${id}`),
      apiGet<{ permissions: Permission[] }>("/api/admin/staff/permissions"),
    ])
      .then(([staffData, permsData]) => {
        if (staffData.staff) {
          setStaff(staffData.staff);
          setForm({
            full_name: staffData.staff.full_name || "",
            email: staffData.staff.email || "",
            phone: staffData.staff.phone || "",
            department: staffData.staff.staff?.department || "",
            designation: staffData.staff.staff?.designation || "",
            campus_id: staffData.staff.campus_id || "",
            is_active: staffData.staff.is_active ?? true,
          });
          const existingPermIds = (staffData.staff.permissions || []).map((p) => p.id);
          setSelectedPerms(existingPermIds);
        }
        setPermissions(permsData.permissions || []);
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
    if (!form.department.trim()) newErrors.department = "Department is required";
    if (!form.designation.trim()) newErrors.designation = "Designation is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await apiPut(`/api/admin/staff?id=${id}`, { ...form, permissionIds: selectedPerms });
      toast.success("Staff updated successfully");
      router.push(`/${ADMIN_SEGMENT}/staff`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400 opacity-60" />
        <p className="text-gray-400 text-lg font-medium">Staff member not found</p>
        <p className="text-sm text-gray-500 mt-1">The staff member you are looking for does not exist or has been removed.</p>
        <Button onClick={() => router.push(`/${ADMIN_SEGMENT}/staff`)} className="mt-4" variant="outline">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Staff
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Staff
      </button>

      <div>
        <h1 className="text-3xl font-bold text-white">Edit Staff</h1>
        <p className="text-gray-400 mt-1">Update staff information, role, and permissions</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold text-white flex items-center gap-2"><Users className="w-5 h-5 text-amber-400" /> Staff Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name <span className="text-red-400">*</span></label>
              <input
                required
                value={form.full_name}
                onChange={(e) => { setForm({ ...form, full_name: e.target.value }); setErrors((p) => ({ ...p, full_name: "" })); }}
                className={`w-full px-4 py-2.5 bg-slate-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors ${errors.full_name ? "border-red-500/50" : "border-slate-700"}`}
              />
              {errors.full_name && <p className="text-xs text-red-400 mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors((p) => ({ ...p, email: "" })); }}
                className={`w-full px-4 py-2.5 bg-slate-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors ${errors.email ? "border-red-500/50" : "border-slate-700"}`}
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Department <span className="text-red-400">*</span></label>
              <input
                required
                value={form.department}
                onChange={(e) => { setForm({ ...form, department: e.target.value }); setErrors((p) => ({ ...p, department: "" })); }}
                className={`w-full px-4 py-2.5 bg-slate-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors ${errors.department ? "border-red-500/50" : "border-slate-700"}`}
              />
              {errors.department && <p className="text-xs text-red-400 mt-1">{errors.department}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Designation <span className="text-red-400">*</span></label>
              <input
                required
                value={form.designation}
                onChange={(e) => { setForm({ ...form, designation: e.target.value }); setErrors((p) => ({ ...p, designation: "" })); }}
                className={`w-full px-4 py-2.5 bg-slate-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors ${errors.designation ? "border-red-500/50" : "border-slate-700"}`}
              />
              {errors.designation && <p className="text-xs text-red-400 mt-1">{errors.designation}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Campus ID</label>
              <input
                value={form.campus_id}
                onChange={(e) => setForm({ ...form, campus_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                placeholder="Campus UUID"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-900/30 rounded-xl border border-slate-700/30">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-5 h-5 rounded border-gray-600 text-amber-400 focus:ring-amber-500/30"
              />
              <label htmlFor="is_active" className="text-sm text-gray-300 cursor-pointer select-none">
                <span className="font-medium text-white">Active Account</span>
                <p className="text-xs text-gray-500 mt-0.5">Inactive staff cannot log in</p>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold text-white flex items-center gap-2"><Shield className="w-5 h-5 text-blue-400" /> Permissions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {permissions.map((p) => (
              <label key={p.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/40 border border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-colors">
                <input
                  type="checkbox"
                  value={p.id}
                  checked={selectedPerms.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedPerms((prev) => [...prev, p.id]);
                    else setSelectedPerms((prev) => prev.filter((pid) => pid !== p.id));
                  }}
                  className="w-4 h-4 rounded border-gray-600 text-amber-400 focus:ring-amber-500/30"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-300">{p.name}</span>
                  <span className="text-xs text-gray-500 ml-1.5">({p.category})</span>
                </div>
              </label>
            ))}
          </div>
          {permissions.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No permissions available.</p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-xl border border-slate-600 text-gray-300 hover:bg-slate-700/50 transition-all text-sm font-medium">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
