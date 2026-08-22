"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import { supabase } from "@/lib/supabase-client";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ADMIN_SEGMENT } from "@/lib/constants";

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  staff?: {
    department: string;
    designation: string;
    employee_id: string;
  };
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

  useEffect(() => {
    Promise.all([
      apiGet<{ staff: StaffMember | null }>(`/api/admin/staff?id=${id}`),
      apiGet<{ permissions: Permission[] }>("/api/admin/staff/permissions"),
    ])
      .then(([staffData, permsData]) => {
        setStaff(staffData.staff);
        setPermissions(permsData.permissions || []);
        setLoading(false);
      })
      .catch((err) => {
        toast.error(getErrorMessage(err));
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData);
    try {
      const { data: { session: editSession } } = await supabase.auth.getSession();
      const editToken = editSession?.access_token || "";
      const res = await fetch(`/api/admin/staff?id=${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${editToken}` },
        body: JSON.stringify({ ...body, permissionIds: selectedPerms }),
      });
      if (!res.ok) throw new Error("Failed to update staff");
      toast.success("Staff updated successfully");
      router.push(`/${ADMIN_SEGMENT}/staff`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;
  if (!staff) return <div className="text-gray-400 text-center py-12">Staff member not found.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Staff
      </button>
      <h1 className="text-2xl font-bold text-white">Edit Staff</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
          <Input name="full_name" defaultValue={staff.full_name} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <Input name="email" type="email" defaultValue={staff.email} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
          <Input name="phone" defaultValue={staff.phone || ""} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Department</label>
          <Input name="department" defaultValue={staff.staff?.department || ""} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Designation</label>
          <Input name="designation" defaultValue={staff.staff?.designation || ""} required />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_active" name="is_active" defaultChecked={staff.is_active} className="w-4 h-4 rounded border-gray-600 text-amber-400" />
          <label htmlFor="is_active" className="text-sm text-gray-300">Active</label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Permissions</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {permissions.map((p) => (
              <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800 border border-gray-700 cursor-pointer hover:bg-slate-700 transition-colors">
                <input
                  type="checkbox"
                  value={p.id}
                  checked={selectedPerms.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedPerms((prev) => [...prev, p.id]);
                    else setSelectedPerms((prev) => prev.filter((id) => id !== p.id));
                  }}
                  className="w-4 h-4 rounded border-gray-600 text-amber-400"
                />
                <span className="text-sm text-gray-300">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
