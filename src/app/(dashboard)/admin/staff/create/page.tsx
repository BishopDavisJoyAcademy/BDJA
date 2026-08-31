"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2, Users, Copy, Check, Mail, MessageCircle, X, Shield, Key } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";
import { apiGet, apiPost } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Permission {
  id: string;
  key: string;
  name: string;
  category: string;
}

interface CreatedCredentials {
  email: string;
  tempPassword: string;
}

export default function CreateStaffPage() {
  const router = useRouter();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    campus_id: "",
  });

  useEffect(() => {
    apiGet<{ permissions: Permission[] }>("/api/admin/staff/permissions")
      .then((d) => setPermissions(d.permissions || []))
      .catch((err) => toast.error("Failed to load permissions: " + getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

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

    setSubmitting(true);
    setCredentials(null);
    try {
      const data = await apiPost<{
        success: boolean;
        credentials: CreatedCredentials;
        staff: { id: string; full_name: string };
        message: string;
      }>("/api/admin/staff", { ...form, permissionIds: selectedPerms, action: "create" });

      setCredentials(data.credentials);
      toast.success(data.message || "Staff created successfully");
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!credentials) return;
    const text = `BDJA Staff Account\n\nEmail: ${credentials.email}\nTemporary Password: ${credentials.tempPassword}\n\nPlease log in and change your password immediately.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleEmailShare = () => {
    if (!credentials) return;
    const subject = encodeURIComponent("Your BDJA Staff Account");
    const body = encodeURIComponent(
      `Hello,\n\nYour BDJA staff account has been created!\n\nEmail: ${credentials.email}\nTemporary Password: ${credentials.tempPassword}\n\nPlease log in and change your password immediately.\n\n- BDJA Admin`
    );
    window.open(`mailto:${credentials.email}?subject=${subject}&body=${body}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Staff
      </button>

      <div>
        <h1 className="text-3xl font-bold text-white">Add New Staff</h1>
        <p className="text-gray-400 mt-1">Create a new staff member. Email is optional — a secure internal email will be generated automatically if left blank.</p>
      </div>

      {/* Credentials Success Banner */}
      {credentials && (
        <Card className="p-5 border-amber-500/30 bg-amber-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <Button size="sm" variant="ghost" onClick={() => setCredentials(null)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><Shield className="w-5 h-5" /></div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-400 flex items-center gap-2"><Key className="w-4 h-4" /> Staff Created — Save These Credentials</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/50">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm text-white font-medium">{credentials.email}</p>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-lg border border-amber-500/20">
                  <p className="text-xs text-amber-400 mb-1">Temporary Password</p>
                  <p className="text-sm text-white font-mono tracking-wide">{credentials.tempPassword}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={handleCopy} className="border-slate-600 text-gray-300 hover:bg-slate-700">
                  {copied ? <><Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
                </Button>
                <Button size="sm" variant="outline" onClick={handleEmailShare} className="border-slate-600 text-gray-300 hover:bg-slate-700">
                  <Mail className="w-3.5 h-3.5 mr-1 text-blue-400" /> Email
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setCredentials(null); router.push(`/${ADMIN_SEGMENT}/staff`); }} className="border-slate-600 text-gray-300 hover:bg-slate-700">
                  Done — Go to List
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

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
                placeholder="John Doe"
              />
              {errors.full_name && <p className="text-xs text-red-400 mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email <span className="text-gray-500 font-normal">(optional — auto-generated if blank)</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors((p) => ({ ...p, email: "" })); }}
                className={`w-full px-4 py-2.5 bg-slate-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors ${errors.email ? "border-red-500/50" : "border-slate-700"}`}
                placeholder="staff@school.ac.ke"
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone <span className="text-gray-500 font-normal">(optional)</span></label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                placeholder="+254..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Department <span className="text-red-400">*</span></label>
              <input
                required
                value={form.department}
                onChange={(e) => { setForm({ ...form, department: e.target.value }); setErrors((p) => ({ ...p, department: "" })); }}
                className={`w-full px-4 py-2.5 bg-slate-900/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors ${errors.department ? "border-red-500/50" : "border-slate-700"}`}
                placeholder="e.g. Mathematics"
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
                placeholder="e.g. Teacher"
              />
              {errors.designation && <p className="text-xs text-red-400 mt-1">{errors.designation}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Campus ID <span className="text-gray-500 font-normal">(optional)</span></label>
              <input
                value={form.campus_id}
                onChange={(e) => setForm({ ...form, campus_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                placeholder="Campus UUID"
              />
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
                    else setSelectedPerms((prev) => prev.filter((id) => id !== p.id));
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
            <p className="text-sm text-gray-500 text-center py-4">No permissions available. They will be configured automatically.</p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-xl border border-slate-600 text-gray-300 hover:bg-slate-700/50 transition-all text-sm font-medium">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {submitting ? "Creating..." : "Create Staff"}
          </button>
        </div>
      </form>
    </div>
  );
}
