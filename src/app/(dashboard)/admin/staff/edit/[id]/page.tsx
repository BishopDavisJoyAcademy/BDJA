"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { AlertCircle, CheckCircle } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";

interface Permission {
  id: string;
  key: string;
  name: string;
  category: string;
}

export default function EditStaffPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({ full_name: "", email: "", phone: "", department: "", designation: "", is_active: true });
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [staffRes, permRes] = await Promise.all([
          fetch(`/api/admin/staff?id=${id}`),
          fetch("/api/admin/staff/permissions"),
        ]);
        const staffData = await staffRes.json();
        const permData = await permRes.json();

        if (staffData.staff) {
          setForm({
            full_name: staffData.staff.full_name || "",
            email: staffData.staff.email || "",
            phone: staffData.staff.phone || "",
            department: staffData.staff.staff?.department || "",
            designation: staffData.staff.staff?.designation || "",
            is_active: staffData.staff.is_active ?? true,
          });
        }
        setPermissions(permData.permissions || []);
        setSelectedPerms((permData.permissions || []).filter((p: any) => p.granted).map((p: any) => p.id));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/staff?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, permissionIds: selectedPerms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setSaved(true);
      setTimeout(() => router.push(`/${ADMIN_SEGMENT}/staff`), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePerm = (pid: string) => {
    setSelectedPerms((prev) => prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]);
  };

  const grouped = permissions.reduce((acc: Record<string, Permission[]>, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  if (fetching) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  if (saved) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-xl border border-gray-200 p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Staff Updated!</h2>
        <p className="text-gray-500 mt-2">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Staff Member</h1>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
            <input type="text" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
          <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {Object.entries(grouped).map(([category, perms]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {perms.map((p) => (
                    <label key={p.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors ${selectedPerms.includes(p.id) ? "bg-blue-100 text-blue-700 border border-blue-300" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                      <input type="checkbox" className="hidden" checked={selectedPerms.includes(p.id)} onChange={() => togglePerm(p.id)} />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" onClick={() => router.push(`/${ADMIN_SEGMENT}/staff`)}
            className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
