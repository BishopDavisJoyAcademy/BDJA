"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { BookOpen, CheckCircle, XCircle, Clock, Loader2, Trash2, Eye, Plus } from "lucide-react";
import { toast } from "sonner";

interface Admission {
  id: string;
  first_name: string;
  last_name: string;
  parent_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  grade_applied: string;
  status: string;
  created_at: string | null;
  notes: string | null;
  campus_id: string;
  admission_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

export default function AdmissionsManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    parent_name: "",
    parent_email: "",
    parent_phone: "",
    grade_applied: "",
    campus_id: "",
    notes: "",
    gender: "" as "male" | "female" | "other" | "",
    date_of_birth: "",
    status: "pending" as "pending" | "approved" | "rejected" | "enrolled",
  });

  useEffect(() => {
    if (!loading && user?.user_category !== "staff" && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.user_category === "staff" || user?.user_category === "admin") {
      fetchAdmissions();
    }
  }, [user]);

  async function fetchAdmissions() {
    try {
      setFetching(true);
      const res = await fetch("/api/admissions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAdmissions(data.admissions || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load admissions");
    } finally {
      setFetching(false);
    }
  }

  async function updateStatus(id: string, status: "approved" | "rejected" | "enrolled") {
    try {
      const res = await fetch(`/api/admissions?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Admission ${status}`);
      fetchAdmissions();
    } catch (err) {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this admission application?")) return;
    try {
      const res = await fetch(`/api/admissions?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Admission deleted");
      fetchAdmissions();
    } catch (err) {
      toast.error("Failed to delete admission");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        parent_name: form.parent_name || null,
        parent_email: form.parent_email || null,
        parent_phone: form.parent_phone || null,
        notes: form.notes || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
      };
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create admission");
      }
      toast.success("Admission created successfully");
      setShowForm(false);
      setForm({
        first_name: "",
        last_name: "",
        parent_name: "",
        parent_email: "",
        parent_phone: "",
        grade_applied: "",
        campus_id: "",
        notes: "",
        gender: "",
        date_of_birth: "",
        status: "pending",
      });
      fetchAdmissions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create admission");
    } finally {
      setSaving(false);
    }
  }

  const filtered = filter === "all" ? admissions : admissions.filter((a) => a.status === filter);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    enrolled: "bg-blue-100 text-blue-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-bdja-primary animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "staff" && user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admissions Management</h1>
          <p className="text-gray-500">Review and process admission applications</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-bdja-primary text-white rounded-lg hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "New Application"}
        </button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Admission Application</h3>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">First Name *</label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Last Name *</label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Grade Applied *</label>
              <input
                type="text"
                required
                value={form.grade_applied}
                onChange={(e) => setForm({ ...form, grade_applied: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
                placeholder="e.g. Grade 1, Playgroup"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Campus ID *</label>
              <input
                type="text"
                required
                value={form.campus_id}
                onChange={(e) => setForm({ ...form, campus_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
                placeholder="UUID of campus"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Parent Name</label>
              <input
                type="text"
                value={form.parent_name}
                onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Parent Email</label>
              <input
                type="email"
                value={form.parent_email}
                onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Parent Phone</label>
              <input
                type="tel"
                value={form.parent_phone}
                onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as "male" | "female" | "other" | "" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Date of Birth</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary text-sm"
                rows={3}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-bdja-primary text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Submit Application
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex gap-2">
        {["all", "pending", "approved", "rejected", "enrolled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <Card className="p-6">
        {fetching ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No applications found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <div key={a.id} className="flex items-start justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{a.first_name} {a.last_name}</h4>
                    <p className="text-xs text-gray-500">Grade {a.grade_applied} · {a.parent_name || "No parent name"}</p>
                    {a.parent_email && <p className="text-xs text-gray-400">{a.parent_email} · {a.parent_phone}</p>}
                    {a.notes && <p className="text-xs text-gray-400 mt-1 italic">{a.notes}</p>}
                    {a.admission_number && <p className="text-xs text-gray-400 mt-1">Admission #: {a.admission_number}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[a.status] || "bg-gray-100 text-gray-600"}`}>{a.status}</span>
                  <div className="flex gap-1">
                    {a.status === "pending" && (
                      <>
                        <button onClick={() => updateStatus(a.id, "approved")} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => updateStatus(a.id, "rejected")} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject"><XCircle className="w-4 h-4" /></button>
                      </>
                    )}
                    {a.status === "approved" && (
                      <button onClick={() => updateStatus(a.id, "enrolled")} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Enroll"><Eye className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => handleDelete(a.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
