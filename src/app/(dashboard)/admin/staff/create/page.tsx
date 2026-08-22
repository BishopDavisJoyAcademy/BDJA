"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { supabase } from "@/lib/supabase-client";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ADMIN_SEGMENT } from "@/lib/constants";

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
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

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
      const { data: { session: createSession } } = await supabase.auth.getSession();
      const createToken = createSession?.access_token || "";
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${createToken}` },
        body: JSON.stringify({ ...body, permissionIds: selectedPerms }),
      });
      if (!res.ok) throw new Error("Failed to create staff");
      const data = await res.json();
      toast.success(`Staff created! Temp password: ${data.tempPassword || "sent to email"}`);
      router.push(`/${ADMIN_SEGMENT}/staff`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Staff
      </button>
      <h1 className="text-2xl font-bold text-white">Create Staff</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Full Name *</label>
          <Input name="full_name" required placeholder="John Doe" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
          <Input name="email" type="email" required placeholder="staff@school.ac.ke" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
          <Input name="phone" placeholder="+254..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Department *</label>
          <Input name="department" required placeholder="e.g. Mathematics" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Designation *</label>
          <Input name="designation" required placeholder="e.g. Teacher" />
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
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : "Create Staff"}
        </Button>
      </form>
    </div>
  );
}
