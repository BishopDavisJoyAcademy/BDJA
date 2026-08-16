"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Permission {
  id: string;
  key: string;
  name: string;
  category: string;
}

export default function CreateStaffPage() {
  const router = useRouter();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<{ permissions: Permission[] }>("/api/admin/staff/permissions")
      .then((d) => setPermissions(d.permissions || []))
      .catch((err) => toast.error("Failed to load permissions: " + getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData);
    try {
      const res = await fetch("/api/admin/staff", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error("Failed to create staff");
      toast.success("Staff created successfully");
      router.push("/admin/staff");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Create Staff</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
          <Input name="full_name" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <Input name="email" type="email" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Department</label>
          <Input name="department" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Designation</label>
          <Input name="designation" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Permissions</label>
          <Select name="permissions" multiple>
            {permissions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Staff"}
        </Button>
      </form>
    </div>
  );
}
