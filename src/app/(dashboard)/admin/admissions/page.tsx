"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import {
  Users, Search, Filter, Eye, CheckCircle, XCircle, Clock, Loader2,
  ChevronDown, ChevronUp, Calendar, Mail, Phone, MapPin, GraduationCap,
  AlertTriangle, RefreshCw, FileText
} from "lucide-react";

const GOLD = "#D4AF37";

interface Admission {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  grade_applied: string;
  campus_id: string;
  previous_school: string | null;
  previous_grade: string | null;
  home_address: string | null;
  city: string | null;
  county: string | null;
  country: string | null;
  nationality: string | null;
  religion: string | null;
  birth_certificate_no: string | null;
  passport_no: string | null;
  sibling_names: string | null;
  medical_conditions: string | null;
  allergies: string | null;
  special_needs: string | null;
  parent_name: string;
  parent_email: string | null;
  parent_phone: string;
  parent_occupation: string | null;
  parent_address: string | null;
  parent_id_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "enrolled";
  admission_date: string | null;
  interview_date: string | null;
  created_at: string;
}

interface Campus {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  enrolled: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  enrolled: "Enrolled",
};

export default function AdminAdmissionsPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [campuses, setCampuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Admission | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const getHeaders = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
    return headers;
  }, []);

  const fetchAdmissions = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admissions${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setAdmissions(data.admissions || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, getHeaders]);

  const fetchCampuses = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/admin/campuses", { headers });
      const data = await res.json();
      const map: Record<string, string> = {};
      (data.campuses || []).forEach((c: Campus) => { map[c.id] = c.name; });
      setCampuses(map);
    } catch { /* silent */ }
  }, [getHeaders]);

  useEffect(() => {
    fetchAdmissions();
    fetchCampuses();
  }, [fetchAdmissions, fetchCampuses]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/admissions?id=${id}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setAdmissions((prev) => prev.map((a) => a.id === id ? { ...a, status: status as Admission["status"] } : a));
      toast.success(`Application marked as ${status}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  const filtered = admissions.filter((a) => {
    const q = search.toLowerCase();
    return (
      !q ||
      a.first_name.toLowerCase().includes(q) ||
      a.last_name.toLowerCase().includes(q) ||
      a.parent_name.toLowerCase().includes(q) ||
      a.grade_applied.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6" style={{ color: GOLD }} /> Admission Applications
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review and manage incoming admission applications.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAdmissions}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-slate-700/50 hover:bg-slate-800/50 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {["pending", "approved", "rejected", "enrolled"].map((s) => (
          <div key={s} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{STATUS_LABELS[s]}</p>
            <p className="text-2xl font-bold text-white mt-1">
              {admissions.filter((a) => a.status === s).length}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, parent, or grade..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="enrolled">Enrolled</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">No applications found</h3>
          <p className="text-sm text-slate-600 mt-2">
            {search ? "Try adjusting your search." : "No admission applications have been submitted yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <motion.div
              key={a.id}
              layout
              className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 cursor-pointer hover:border-slate-600/50 transition-all"
              onClick={() => setSelected(selected?.id === a.id ? null : a)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-white">
                      {a.first_name} {a.last_name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABELS[a.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {a.grade_applied}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {campuses[a.campus_id] || "Unknown Campus"}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(a.created_at).toLocaleDateString("en-GB")}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {a.parent_email || "—"}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {a.parent_phone}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {a.status === "pending" && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(a.id, "approved"); }}
                        disabled={updating === a.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(a.id, "rejected"); }}
                        disabled={updating === a.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-all disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {a.status === "approved" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateStatus(a.id, "enrolled"); }}
                      disabled={updating === a.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-all disabled:opacity-50"
                    >
                      Enroll
                    </button>
                  )}
                  {selected?.id === a.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>
              </div>

              <AnimatePresence>
                {selected?.id === a.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-slate-700/40 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Student Information</p>
                        <div className="space-y-1.5 text-slate-300">
                          <p><span className="text-slate-500">Full Name:</span> {a.first_name} {a.last_name}</p>
                          <p><span className="text-slate-500">Date of Birth:</span> {a.date_of_birth || "—"}</p>
                          <p><span className="text-slate-500">Gender:</span> {a.gender || "—"}</p>
                          <p><span className="text-slate-500">Nationality:</span> {a.nationality || "—"}</p>
                          <p><span className="text-slate-500">Religion:</span> {a.religion || "—"}</p>
                          <p><span className="text-slate-500">Birth Cert No:</span> {a.birth_certificate_no || "—"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Academic Background</p>
                        <div className="space-y-1.5 text-slate-300">
                          <p><span className="text-slate-500">Grade Applied:</span> {a.grade_applied}</p>
                          <p><span className="text-slate-500">Previous School:</span> {a.previous_school || "—"}</p>
                          <p><span className="text-slate-500">Previous Grade:</span> {a.previous_grade || "—"}</p>
                          <p><span className="text-slate-500">Home Address:</span> {a.home_address || "—"}{a.city ? `, ${a.city}` : ""}{a.county ? `, ${a.county}` : ""}</p>
                          <p><span className="text-slate-500">Country:</span> {a.country || "—"}</p>
                          <p><span className="text-slate-500">Siblings:</span> {a.sibling_names || "—"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Health & Medical</p>
                        <div className="space-y-1.5 text-slate-300">
                          <p><span className="text-slate-500">Medical Conditions:</span> {a.medical_conditions || "None"}</p>
                          <p><span className="text-slate-500">Allergies:</span> {a.allergies || "None"}</p>
                          <p><span className="text-slate-500">Special Needs:</span> {a.special_needs || "None"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Parent / Guardian</p>
                        <div className="space-y-1.5 text-slate-300">
                          <p><span className="text-slate-500">Name:</span> {a.parent_name}</p>
                          <p><span className="text-slate-500">Phone:</span> {a.parent_phone}</p>
                          <p><span className="text-slate-500">Email:</span> {a.parent_email || "—"}</p>
                          <p><span className="text-slate-500">Occupation:</span> {a.parent_occupation || "—"}</p>
                          <p><span className="text-slate-500">ID Number:</span> {a.parent_id_number || "—"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Emergency Contact</p>
                        <div className="space-y-1.5 text-slate-300">
                          <p><span className="text-slate-500">Name:</span> {a.emergency_contact_name || "—"}</p>
                          <p><span className="text-slate-500">Relationship:</span> {a.emergency_contact_relationship || "—"}</p>
                          <p><span className="text-slate-500">Phone:</span> {a.emergency_contact_phone || "—"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Application Details</p>
                        <div className="space-y-1.5 text-slate-300">
                          <p><span className="text-slate-500">Reference:</span> <span className="font-mono text-[#D4AF37]">{a.id.slice(0, 8).toUpperCase()}</span></p>
                          <p><span className="text-slate-500">Submitted:</span> {new Date(a.created_at).toLocaleString("en-GB")}</p>
                          <p><span className="text-slate-500">Status:</span> <span className={STATUS_COLORS[a.status].replace("bg-", "").split(" ")[0]}>{STATUS_LABELS[a.status]}</span></p>
                          {a.notes && <p><span className="text-slate-500">Notes:</span> {a.notes}</p>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
