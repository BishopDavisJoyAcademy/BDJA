"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { PermissionSelector } from "@/components/permissions/PermissionSelector";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function EditStaffPage() {
  const router = useRouter();
  const params = useParams();
  const staffId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<string[]>([]);
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
    if (!staffId) return;
    loadStaff();
  }, [staffId]);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }

      // Fetch staff profile
      const res = await fetch(`/api/admin/staff?id=${staffId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load staff");
      const data = await res.json();
      const member = data.staff;
      if (!member) throw new Error("Staff not found");

      setForm({
        full_name: member.full_name || "",
        email: member.email || "",
        phone: member.phone || "",
        department: member.staff?.department || "",
        designation: member.staff?.designation || "",
        campus_id: member.campus_id || "",
        is_active: member.is_active ?? true,
      });

      // Fetch current permissions
      const permRes = await fetch(`/api/admin/staff/permissions?staffId=${staffId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (permRes.ok) {
        const permData = await permRes.json();
        const ids = permData.permissions?.map((p: any) => p.permission_id) || [];
        setPermissionIds(ids);
        setOriginalPermissions(ids);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Session expired. Please log in again.");
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/admin/staff?id=${staffId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          permissionIds,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Failed to update staff (${res.status})`);
        setSaving(false);
        return;
      }

      toast.success("Staff member updated successfully!");
      router.push("/admin/staff");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-bdja-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/admin/staff" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Staff
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Staff Member</h1>
        <p className="text-gray-500">Update staff details and permissions</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="e.g. John Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john.doe@bdja.ac.ke"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+254 700 000 000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <Input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="e.g. Mathematics"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
            <Input
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              placeholder="e.g. Senior Teacher"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campus ID</label>
            <Input
              value={form.campus_id}
              onChange={(e) => setForm({ ...form, campus_id: e.target.value })}
              placeholder="UUID of campus"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-bdja-primary focus:ring-bdja-primary"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Account Active</label>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Permissions</h3>
          <PermissionSelector
            selected={permissionIds}
            onChange={setPermissionIds}
          />
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" isLoading={saving} disabled={saving}>
            Save Changes
          </Button>
          <Link href="/admin/staff">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
