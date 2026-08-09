"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { PermissionSelector } from "@/components/permissions/PermissionSelector";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function CreateStaffPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    campus_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Secure auth check using getUser()
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Not authenticated. Please log in again.");
        setLoading(false);
        return;
      }

      // Get session token for API call
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/staff", {
        method: "POST",
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
        setError(json.error || `Failed to create staff (${res.status})`);
        setLoading(false);
        return;
      }

      if (!json.success) {
        setError(json.error || "Failed to create staff");
        setLoading(false);
        return;
      }

      toast.success("Staff member created successfully!");
      router.push("/admin/staff");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/admin/staff" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Staff
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Staff Member</h1>
        <p className="text-gray-500">Create a new staff account with permissions</p>
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
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Permissions</h3>
          <PermissionSelector
            selected={permissionIds}
            onChange={setPermissionIds}
          />
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" isLoading={loading} disabled={loading}>
            Create Staff Account
          </Button>
          <Link href="/admin/staff">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
