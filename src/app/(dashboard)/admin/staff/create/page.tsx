"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";

interface Permission {
  id: string;
  key: string;
  name: string;
  category: string;
}

export default function CreateStaffPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", full_name: "", phone: "", department: "General", designation: "Staff", campus_id: "" });
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/staff/permissions")
      .then((r) => r.json())
      .then((data) => setPermissions(data.permissions || []))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, permissionIds: selectedPerms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create staff");
      setResult({ email: data.email, tempPassword: data.tempPassword });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePerm = (id: string) => {
    setSelectedPerms((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const grouped = permissions.reduce((acc: Record<string, Permission[]>, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  if (result) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-xl border border-gray-200 p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Staff Created Successfully!</h2>
        <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 mb-4">
          <p className="text-sm"><span className="font-medium">Email:</span> {result.email}</p>
          <p className="text-sm"><span className="font-medium">Temporary Password:</span> <span className="font-mono bg-yellow-100 px-2 py-0.5 rounded">{result.tempPassword}</span></p>
        </div>
        <p className="text-sm text-red-600 mb-4">Copy this password now. It will not be shown again.</p>
        <button onClick={() => router.push(`/${ADMIN_SEGMENT}/staff`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Back to Staff List
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Staff Member</h1>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
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
        <button type="submit" disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
          {loading ? "Creating..." : "Create Staff Member"}
        </button>
      </form>
    </div>
  );
}
