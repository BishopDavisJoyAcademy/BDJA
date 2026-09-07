"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHead, TableBody, TableCell, TableHeader } from "@/components/ui/Table";
import {
  Loader2, Plus, Pencil, Trash2, Users, Key, X, CheckCircle, Search,
  Filter, Power, PowerOff, Eye, Copy, ChevronDown, ChevronUp, RefreshCw,
  Briefcase, Mail, Phone, Building2, Calendar, Shield, Fingerprint,
  Activity, Terminal, UserX, GraduationCap, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface StaffRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  user_category: string;
  is_active: boolean;
  password_changed: boolean;
  campus_id: string | null;
  campus_name?: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
  staff?: {
    department: string | null;
    designation: string | null;
    employee_id: string | null;
    status: string | null;
    join_date: string | null;
    qualification: string | null;
    specialization: string | null;
  } | null;
}

interface PermissionRecord {
  key: string;
  name: string;
  category: string;
  granted: boolean;
}

interface ActivityRecord {
  id: string;
  action: string;
  table_name: string | null;
  created_at: string;
}

interface SessionRecord {
  id: string;
  device_info: string | null;
  ip_address: string | null;
  created_at: string;
}

const DEPARTMENTS = ["Administration", "Teaching", "Finance", "IT", "Library", "Sports", "Counseling", "Maintenance"];
const DESIGNATIONS = ["Headteacher", "Deputy Headteacher", "Teacher", "Accountant", "Librarian", "IT Manager", "Counselor", "Coach", "Administrator"];
const ROLES = ["headteacher", "deputy_headteacher", "teacher", "accountant", "librarian", "it_manager", "counselor", "coach", "administrator"];

export default function StaffManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffRecord | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);
  const [detailTab, setDetailTab] = useState<"profile" | "permissions" | "activity" | "sessions">("profile");
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "teacher",
    department: "Teaching",
    designation: "Teacher",
    employee_id: "",
    qualification: "",
    specialization: "",
  });

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (deptFilter !== "all") params.set("department", deptFilter);
      if (search.trim()) params.set("q", search.trim());
      params.set("sort", sortField);
      params.set("dir", sortDir);

      const data = await apiGet<{ staff: StaffRecord[] }>(`/api/admin/staff?${params.toString()}`);
      setStaff(data.staff || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, deptFilter, search, sortField, sortDir]);

  useEffect(() => {
    if (user?.user_category === "admin") fetchStaff();
  }, [user, fetchStaff]);

  const resetForm = () => {
    setForm({
      full_name: "", email: "", phone: "", role: "teacher",
      department: "Teaching", designation: "Teacher", employee_id: "",
      qualification: "", specialization: "",
    });
  };

  const openCreate = () => { resetForm(); setShowCreate(true); };
  const openEdit = (s: StaffRecord) => {
    setForm({
      full_name: s.full_name, email: s.email, phone: s.phone || "",
      role: s.role, department: s.staff?.department || "Teaching",
      designation: s.staff?.designation || "Teacher",
      employee_id: s.staff?.employee_id || "",
      qualification: s.staff?.qualification || "",
      specialization: s.staff?.specialization || "",
    });
    setSelectedStaff(s);
    setShowEdit(true);
  };

  const openDetail = async (s: StaffRecord) => {
    setSelectedStaff(s);
    setDetailTab("profile");
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const [permData, actData, sessData] = await Promise.all([
        apiGet<{ permissions: PermissionRecord[] }>(`/api/admin/sovereign-view/permissions?profileId=${s.id}`),
        apiGet<{ activity: ActivityRecord[] }>(`/api/admin/sovereign-view/activity?userId=${s.id}`),
        apiGet<{ sessions: SessionRecord[] }>(`/api/admin/sessions?userId=${s.id}`),
      ]);
      setPermissions(permData.permissions || []);
      setActivity(actData.activity || []);
      setSessions(sessData.sessions || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const data = await apiPost<{ success: boolean; credentials?: { email: string; tempPassword: string } }>("/api/admin/staff", form);
      if (data.credentials) {
        setCredentials(data.credentials);
        setShowCredentials(true);
      }
      toast.success("Staff created");
      setShowCreate(false);
      resetForm();
      fetchStaff();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setSaving(true);
    try {
      await apiPatch("/api/admin/staff", { id: selectedStaff.id, ...form });
      toast.success("Staff updated");
      setShowEdit(false);
      fetchStaff();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this staff member?")) return;
    setDeletingId(id);
    try {
      await apiDelete(`/api/admin/staff?id=${id}`);
      setStaff((prev) => prev.filter((s) => s.id !== id));
      toast.success("Staff deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const toggleStatus = async (s: StaffRecord) => {
    setTogglingId(s.id);
    try {
      await apiPatch("/api/admin/staff", {
        id: s.id,
        is_active: !s.is_active,
        revokeSessions: !s.is_active === false,
      });
      setStaff((prev) => prev.map((st) => st.id === s.id ? { ...st, is_active: !st.is_active } : st));
      toast.success(`${s.full_name} is now ${!s.is_active ? "active" : "inactive"}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const generatePassword = async (id: string) => {
    setGeneratingId(id);
    try {
      const data = await apiPost<{ credentials: { email: string; tempPassword: string } }>("/api/admin/staff/generate-password", { id });
      setCredentials(data.credentials);
      setShowCredentials(true);
      toast.success("Temporary password generated");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setGeneratingId(null);
    }
  };

  const togglePermission = async (permKey: string, granted: boolean) => {
    if (!selectedStaff) return;
    try {
      await apiPost("/api/admin/sovereign-view/permissions", {
        profileId: selectedStaff.id,
        permissionKey: permKey,
        granted,
      });
      setPermissions((prev) => prev.map((p) => p.key === permKey ? { ...p, granted } : p));
      toast.success(`Permission ${granted ? "granted" : "revoked"}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await apiPatch("/api/admin/sessions", { sessionId });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session revoked");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const revokeAllSessions = async () => {
    if (!selectedStaff) return;
    if (!confirm("Revoke ALL sessions? They will be logged out everywhere.")) return;
    try {
      await apiPatch("/api/admin/sessions", { userId: selectedStaff.id, revokeAll: true });
      setSessions([]);
      toast.success("All sessions revoked");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const stats = {
    total: staff.length,
    active: staff.filter((s) => s.is_active).length,
    inactive: staff.filter((s) => !s.is_active).length,
    passwordPending: staff.filter((s) => !s.password_changed).length,
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Staff Management</h1>
          <p className="text-slate-400">Manage teachers, administrators, and support staff</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStaff} variant="outline" className="border-slate-700/50 text-slate-300">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openCreate} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users, color: "text-[#D4AF37]" },
          { label: "Active", value: stats.active, icon: Power, color: "text-emerald-400" },
          { label: "Inactive", value: stats.inactive, icon: PowerOff, color: "text-red-400" },
          { label: "First Login", value: stats.passwordPending, icon: Key, color: "text-amber-400" },
        ].map((s) => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <p className="text-2xl font-bold text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Search & Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchStaff()}
            className="pl-10 bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30">
          <option value="all">All Departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <Button onClick={fetchStaff} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Users className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-lg font-medium text-slate-400">No staff found</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeader className="cursor-pointer" onClick={() => handleSort("full_name")}>Name {sortField === "full_name" && (sortDir === "asc" ? <ChevronUp className="inline w-3 h-3" /> : <ChevronDown className="inline w-3 h-3" />)}</TableHeader>
                  <TableHeader>Department</TableHeader>
                  <TableHeader>Designation</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Last Login</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                <AnimatePresence>
                  {staff.map((s, index) => (
                    <motion.tr key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }} transition={{ delay: index * 0.02 }}
                      className="hover:bg-slate-800/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700/50">
                            {s.avatar_url ? (
                              <Image src={s.avatar_url} alt={s.full_name} width={36} height={36} className="object-cover" />
                            ) : (
                              <Briefcase className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-200">{s.full_name}</p>
                            <p className="text-xs text-slate-500">{s.email}</p>
                            {s.staff?.employee_id && <p className="text-xs text-slate-600">ID: {s.staff.employee_id}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-slate-300">{s.staff?.department || "—"}</span></TableCell>
                      <TableCell><span className="text-slate-300">{s.staff?.designation || "—"}</span></TableCell>
                      <TableCell>
                        <Badge variant={s.is_active ? "success" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                        {!s.password_changed && <Badge variant="warning" className="ml-1.5">First Login</Badge>}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400">{s.last_login_at ? new Date(s.last_login_at).toLocaleDateString() : "Never"}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openDetail(s)}
                            className="text-slate-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10" title="View Details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => generatePassword(s.id)}
                            disabled={generatingId === s.id}
                            className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10" title="Generate Password">
                            {generatingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(s)}
                            className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => toggleStatus(s)}
                            disabled={togglingId === s.id}
                            className={s.is_active ? "text-emerald-400 hover:text-red-400 hover:bg-red-500/10" : "text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"}
                            title={s.is_active ? "Deactivate" : "Activate"}>
                            {togglingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : s.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)}
                            disabled={deletingId === s.id}
                            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10" title="Delete">
                            {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </Card>
      </motion.div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title="Add Staff Member">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required
                className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required
                className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Employee ID</label>
              <Input value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Role *</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Department</label>
              <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Designation</label>
              <select value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Qualification</label>
              <Input value={form.qualification} onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
                className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1">Specialization</label>
            <Input value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
              className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={() => { setShowCreate(false); resetForm(); }} variant="outline" className="flex-1 border-slate-700/50 text-slate-400">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Staff Member">
        {selectedStaff && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
                <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required
                  className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required
                  className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Employee ID</label>
                <Input value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                  className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Role *</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Department</label>
                <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Designation</label>
                <select value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                  {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Qualification</label>
                <Input value={form.qualification} onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
                  className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Specialization</label>
              <Input value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
                className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={() => setShowEdit(false)} variant="outline" className="flex-1 border-slate-700/50 text-slate-400">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Credentials Modal */}
      <Modal isOpen={showCredentials} onClose={() => setShowCredentials(null)} title="Temporary Credentials" size="sm">
        {credentials && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-amber-400 text-sm font-medium">Share these credentials securely</p>
            </div>
            <div className="space-y-2">
              <Card className="p-3"><p className="text-xs text-slate-500">Email</p><p className="text-slate-200 font-mono">{credentials.email}</p></Card>
              <Card className="p-3"><p className="text-xs text-slate-500">Temporary Password</p><p className="text-slate-200 font-mono">{credentials.tempPassword}</p></Card>
            </div>
            <Button onClick={() => { navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.tempPassword}`); toast.success("Copied"); }}
              className="w-full bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
          </div>
        )}
      </Modal>

      {/* Detail Modal - Premium Eye View */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Staff Profile" size="xl">
        {selectedStaff && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border-2 border-[#D4AF37]/30">
                {selectedStaff.avatar_url ? (
                  <Image src={selectedStaff.avatar_url} alt={selectedStaff.full_name} width={64} height={64} className="rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-[#D4AF37]">{selectedStaff.full_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">{selectedStaff.full_name}</h3>
                <p className="text-slate-400">{selectedStaff.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={selectedStaff.is_active ? "success" : "secondary"}>{selectedStaff.is_active ? "Active" : "Inactive"}</Badge>
                  <Badge variant="info">{selectedStaff.role.replace(/_/g, " ")}</Badge>
                  {selectedStaff.staff?.department && <Badge variant="outline">{selectedStaff.staff.department}</Badge>}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-800">
              {[
                { key: "profile", label: "Profile", icon: Briefcase },
                { key: "permissions", label: "Permissions", icon: Shield },
                { key: "activity", label: "Activity", icon: Activity },
                { key: "sessions", label: "Sessions", icon: Fingerprint },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setDetailTab(tab.key as never)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    detailTab === tab.key ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}>
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {loadingDetail ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
              </div>
            ) : detailTab === "profile" && (
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Phone</p><p className="text-slate-200">{selectedStaff.phone || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Employee ID</p><p className="text-slate-200">{selectedStaff.staff?.employee_id || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Department</p><p className="text-slate-200">{selectedStaff.staff?.department || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Designation</p><p className="text-slate-200">{selectedStaff.staff?.designation || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Qualification</p><p className="text-slate-200">{selectedStaff.staff?.qualification || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Specialization</p><p className="text-slate-200">{selectedStaff.staff?.specialization || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Campus</p><p className="text-slate-200">{selectedStaff.campus_name || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Joined</p><p className="text-slate-200">{selectedStaff.staff?.join_date ? new Date(selectedStaff.staff.join_date).toLocaleDateString() : "—"}</p></Card>
              </div>
            )}

            {detailTab === "permissions" && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {permissions.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No permissions configured</p>
                ) : (
                  permissions.map((perm) => (
                    <Card key={perm.key} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-200">{perm.name}</p>
                        <p className="text-xs text-slate-500">{perm.category}</p>
                      </div>
                      <button onClick={() => togglePermission(perm.key, !perm.granted)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${perm.granted ? "bg-[#D4AF37]" : "bg-slate-700"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${perm.granted ? "translate-x-5" : ""}`} />
                      </button>
                    </Card>
                  ))
                )}
              </div>
            )}

            {detailTab === "activity" && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activity.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No recent activity</p>
                ) : (
                  activity.map((a) => (
                    <Card key={a.id} className="p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <Terminal className="w-4 h-4 text-[#D4AF37]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200">{a.action}</p>
                        <p className="text-xs text-slate-500">{a.table_name || "—"}</p>
                      </div>
                      <p className="text-xs text-slate-600 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</p>
                    </Card>
                  ))
                )}
              </div>
            )}

            {detailTab === "sessions" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">{sessions.length} active session{sessions.length !== 1 ? "s" : ""}</p>
                  {sessions.length > 0 && (
                    <Button size="sm" onClick={revokeAllSessions}
                      className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Revoke All
                    </Button>
                  )}
                </div>
                {sessions.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No active sessions</p>
                ) : (
                  sessions.map((s) => {
                    const deviceLabel = (() => {
                      if (!s.device_info) return "Unknown Device";
                      if (typeof s.device_info === "string") return s.device_info;
                      if (typeof s.device_info === "object" && s.device_info !== null) {
                        const obj = s.device_info as Record<string, unknown>;
                        return String(obj.user_agent || obj.browser || obj.device || JSON.stringify(s.device_info));
                      }
                      return "Unknown Device";
                    })();
                    const ipLabel = typeof s.ip_address === "string" ? s.ip_address : "Unknown IP";
                    return (
                      <Card key={s.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-200">{deviceLabel}</p>
                          <p className="text-xs text-slate-500">{ipLabel}</p>
                          <p className="text-xs text-slate-600">{new Date(s.created_at).toLocaleString()}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => revokeSession(s.id)}
                          className="text-red-400 hover:bg-red-500/10">
                          <UserX className="w-4 h-4" />
                        </Button>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
