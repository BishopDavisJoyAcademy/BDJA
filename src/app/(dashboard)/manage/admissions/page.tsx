"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  BookOpen, CheckCircle, XCircle, Clock, Loader2, Trash2, Plus, GraduationCap,
  Inbox, MapPin, RefreshCw, ChevronDown
} from "lucide-react";

const GOLD = "#D4AF37";

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

interface Campus {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
}

type AdmissionStatus = "pending" | "approved" | "rejected" | "enrolled";

interface AdmissionFormState {
  first_name: string;
  last_name: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  grade_applied: string;
  campus_id: string;
  notes: string;
  gender: "" | "male" | "female" | "other";
  date_of_birth: string;
  status: AdmissionStatus;
}

const emptyForm: AdmissionFormState = {
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
};

const statusVariant: Record<string, "warning" | "success" | "danger" | "info"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  enrolled: "info",
};

const statusIcon: Record<string, React.ElementType> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  enrolled: GraduationCap,
};

const filterTabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "enrolled", label: "Enrolled" },
];

const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37]/40 transition-all";
const labelClass = "block text-xs font-medium text-slate-400 mb-1.5";

const stagger = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" as const },
  }),
};

export default function AdmissionsManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AdmissionFormState>(emptyForm);

  useEffect(() => {
    if (!loading && user?.user_category !== "staff" && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, loading, router]);

  const fetchCampuses = async () => {
    try {
      const data = await apiGet<{ campuses: Campus[] }>("/api/admin/campuses");
      setCampuses((data.campuses || []).filter((c) => c.is_active));
    } catch {
      /* campus list is auxiliary — page still works without it */
    }
  };

  async function fetchAdmissions() {
    try {
      setFetching(true);
      const data = await apiGet<{ admissions: Admission[] }>("/api/admissions");
      setAdmissions(data.admissions || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to load admissions");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (user?.user_category === "staff" || user?.user_category === "admin") {
      fetchAdmissions();
      fetchCampuses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const campusName = useMemo(() => {
    const map: Record<string, string> = {};
    campuses.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [campuses]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: admissions.length, pending: 0, approved: 0, rejected: 0, enrolled: 0 };
    admissions.forEach((a) => { if (c[a.status] !== undefined) c[a.status]++; });
    return c;
  }, [admissions]);

  const filtered = filter === "all" ? admissions : admissions.filter((a) => a.status === filter);

  async function updateStatus(id: string, status: Exclude<AdmissionStatus, "pending">) {
    try {
      await apiPut<{ success: boolean }>(`/api/admissions?id=${id}`, { status });
      toast.success(`Application ${status}`);
      fetchAdmissions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to update status");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this admission application? This cannot be undone.")) return;
    try {
      await apiDelete<{ success: boolean }>(`/api/admissions?id=${id}`);
      toast.success("Application deleted");
      fetchAdmissions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to delete application");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.campus_id) {
      toast.error("Please select a campus");
      return;
    }
    setSaving(true);
    try {
      await apiPost<{ success: boolean }>("/api/admissions", {
        first_name: form.first_name,
        last_name: form.last_name,
        parent_name: form.parent_name || null,
        parent_email: form.parent_email || null,
        parent_phone: form.parent_phone || null,
        grade_applied: form.grade_applied,
        campus_id: form.campus_id,
        notes: form.notes || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        status: form.status,
      });
      toast.success("Admission application created");
      setShowForm(false);
      setForm(emptyForm);
      fetchAdmissions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to create admission");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  if (user?.user_category !== "staff" && user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25">
              <BookOpen className="w-4.5 h-4.5" style={{ color: GOLD }} />
            </span>
            Admissions Management
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">Review and process admission applications</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdmissions}
            disabled={fetching}
            className="p-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-950 transition-all hover:opacity-90"
            style={{ background: GOLD }}
          >
            <Plus className="w-4 h-4" />
            {showForm ? "Cancel" : "New Application"}
          </button>
        </div>
      </motion.div>

      {/* New application form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Card>
              <CardHeader>
                <CardTitle>New Admission Application</CardTitle>
                <CardDescription>Manually record an application received outside the online portal</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>First Name *</label>
                    <input type="text" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputClass} placeholder="e.g. Jane" />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name *</label>
                    <input type="text" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputClass} placeholder="e.g. Doe" />
                  </div>
                  <div>
                    <label className={labelClass}>Grade Applied *</label>
                    <input type="text" required value={form.grade_applied} onChange={(e) => setForm({ ...form, grade_applied: e.target.value })} className={inputClass} placeholder="e.g. Grade 1, Playgroup" />
                  </div>
                  <div>
                    <label className={labelClass}>Campus *</label>
                    <div className="relative">
                      <select required value={form.campus_id} onChange={(e) => setForm({ ...form, campus_id: e.target.value })} className={`${inputClass} appearance-none pr-10`}>
                        <option value="">Select campus</option>
                        {campuses.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} — {c.location}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    {campuses.length === 0 && (
                      <p className="text-xs text-amber-400 mt-1.5">No active campuses found. Add one under Campuses first.</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Date of Birth</label>
                    <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className={`${inputClass} [color-scheme:dark]`} />
                  </div>
                  <div>
                    <label className={labelClass}>Gender</label>
                    <div className="relative">
                      <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as AdmissionFormState["gender"] })} className={`${inputClass} appearance-none pr-10`}>
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Parent/Guardian Name</label>
                    <input type="text" value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Parent Phone</label>
                    <input type="tel" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Parent Email</label>
                    <input type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Initial Status</label>
                    <div className="relative">
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AdmissionStatus })} className={`${inputClass} appearance-none pr-10`}>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="enrolled">Enrolled</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Notes</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={`${inputClass} resize-none`} placeholder="Any additional remarks about this application" />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-950 transition-all hover:opacity-90 disabled:opacity-60"
                      style={{ background: GOLD }}
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Create Application
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filter === t.key
                ? "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30"
                : "bg-slate-900/60 text-slate-400 border-slate-700/50 hover:text-slate-200 hover:border-slate-600/50"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${filter === t.key ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-slate-800 text-slate-500"}`}>
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </motion.div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {fetching ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: GOLD }} />
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 px-6 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4">
                <Inbox className="w-7 h-7 text-slate-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">
                {filter === "all" ? "No applications yet" : `No ${filter} applications`}
              </h3>
              <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
                {filter === "all"
                  ? "New online and manually entered applications will appear here."
                  : `Applications marked as ${filter} will appear here.`}
              </p>
            </motion.div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {filtered.map((a, i) => {
                const Icon = statusIcon[a.status] || Clock;
                return (
                  <motion.div
                    key={a.id}
                    custom={i}
                    initial="hidden"
                    animate="show"
                    variants={stagger}
                    className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800/70 border border-slate-700/50 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4.5 h-4.5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-sm font-semibold text-white">
                        {a.first_name} {a.last_name}
                        {a.admission_number && <span className="ml-2 text-xs font-mono text-slate-500">{a.admission_number}</span>}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3 text-[#D4AF37]/70" /> {a.grade_applied}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-[#D4AF37]/70" /> {campusName[a.campus_id] || "—"}</span>
                        {a.parent_phone && <span>{a.parent_phone}</span>}
                        {a.created_at && (
                          <span>{new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        )}
                      </p>
                    </div>
                    <Badge variant={statusVariant[a.status] || "default"}>
                      <Icon className="w-3 h-3 mr-1" />
                      {a.status}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      {a.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateStatus(a.id, "approved")}
                            className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateStatus(a.id, "rejected")}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {a.status === "approved" && (
                        <button
                          onClick={() => updateStatus(a.id, "enrolled")}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 transition-all hover:opacity-90"
                          style={{ background: GOLD }}
                          title="Mark as enrolled"
                        >
                          Enroll
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
