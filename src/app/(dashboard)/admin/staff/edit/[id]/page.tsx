"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiGet<{ staffMember: StaffMember | null }>(`/api/admin/staff?id=${id}`),
      apiGet<{ permissions: Permission[] }>("/api/admin/staff/permissions"),
    ])
      .then(([staffData, permsData]) => {
        setStaff(staffData.staffMember);
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
      const res = await fetch(`/api/admin/staff?id=${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to update staff");
      toast.success("Staff updated successfully");
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
          <label className="block text-sm font-medium text-gray-300 mb-1">Department</label>
          <Input name="department" defaultValue={staff.staff?.department || ""} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Designation</label>
          <Input name="designation" defaultValue={staff.staff?.designation || ""} required />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
