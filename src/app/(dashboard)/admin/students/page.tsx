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
  GraduationCap, ArrowUpCircle, Archive, Shuffle, AlertTriangle,
  BookOpen, Calendar, BarChart3, Fingerprint, Activity
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface StudentRecord {
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
  students?: {
    admission_number: string | null;
    grade_level: string | null;
    class_id: string | null;
    class_name?: string | null;
    status: string | null;
    enrollment_date: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    guardian_email: string | null;
  } | null;
}

const GRADE_LEVELS = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

export default function StudentManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showBulkPromote, setShowBulkPromote] = useState(false);
  const [showBulkTransfer, setShowBulkTransfer] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);
  const [targetGrade, setTargetGrade] = useState("");
  const [targetClass, setTargetClass] = useState("");
  const [classes, setClasses] = useState<{ id: string; name: string; grade_level: string }[]>([]);
  const [detailTab, setDetailTab] = useState<"profile" | "academics" | "attendance" | "fees">("profile");

  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", grade_level: "Grade 1",
    admission_number: "", guardian_name: "", guardian_phone: "", guardian_email: "",
  });

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (gradeFilter !== "all") params.set("grade", gradeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());
      params.set("sort", sortField);
      params.set("dir", sortDir);

      const data = await apiGet<{ students: StudentRecord[] }>(`/api/admin/students?${params.toString()}`);
      setStudents(data.students || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [gradeFilter, statusFilter, search, sortField, sortDir]);

  const fetchClasses = async () => {
    try {
      const data = await apiGet<{ classes: { id: string; name: string; grade_level: string }[] }>("/api/admin/classes");
      setClasses(data.classes || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  useEffect(() => {
    if (user?.user_category === "admin") {
      fetchStudents();
      fetchClasses();
    }
  }, [user, fetchStudents]);

  const resetForm = () => {
    setForm({ full_name: "", email: "", phone: "", grade_level: "Grade 1", admission_number: "", guardian_name: "", guardian_phone: "", guardian_email: "" });
  };

  const openCreate = () => { resetForm(); setShowCreate(true); };
  const openEdit = (s: StudentRecord) => {
    setForm({
      full_name: s.full_name, email: s.email, phone: s.phone || "",
      grade_level: s.students?.grade_level || "Grade 1",
      admission_number: s.students?.admission_number || "",
      guardian_name: s.students?.guardian_name || "",
      guardian_phone: s.students?.guardian_phone || "",
      guardian_email: s.students?.guardian_email || "",
    });
    setSelectedStudent(s);
    setShowEdit(true);
  };

  const openDetail = (s: StudentRecord) => {
    setSelectedStudent(s);
    setDetailTab("profile");
    setShowDetail(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) { toast.error("Name and email required"); return; }
    setSaving(true);
    try {
      const data = await apiPost<{ success: boolean; credentials?: { email: string; tempPassword: string } }>("/api/admin/students", form);
      if (data.credentials) { setCredentials(data.credentials); setShowCredentials(true); }
      toast.success("Student enrolled");
      setShowCreate(false); resetForm(); fetchStudents();
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);
    try {
      await apiPatch("/api/admin/students", { id: selectedStudent.id, ...form });
      toast.success("Student updated");
      setShowEdit(false); fetchStudents();
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this student?")) return;
    setDeletingId(id);
    try {
      await apiDelete(`/api/admin/students?id=${id}`);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      toast.success("Student deleted");
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
    finally { setDeletingId(null); }
  };

  const toggleStatus = async (s: StudentRecord) => {
    setTogglingId(s.id);
    try {
      await apiPatch("/api/admin/students", { id: s.id, is_active: !s.is_active });
      setStudents((prev) => prev.map((st) => st.id === s.id ? { ...st, is_active: !st.is_active } : st));
      toast.success(`${s.full_name} is now ${!s.is_active ? "active" : "inactive"}`);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
    finally { setTogglingId(null); }
  };

  const promoteStudent = async (s: StudentRecord) => {
    const currentIdx = GRADE_LEVELS.indexOf(s.students?.grade_level || "");
    const nextGrade = currentIdx >= 0 && currentIdx < GRADE_LEVELS.length - 1 ? GRADE_LEVELS[currentIdx + 1] : null;
    if (!nextGrade) { toast.error("Already at highest grade"); return; }
    if (!confirm(`Promote ${s.full_name} to ${nextGrade}?`)) return;
    try {
      await apiPatch("/api/admin/students", { id: s.id, grade_level: nextGrade, action: "promote" });
      setStudents((prev) => prev.map((st) => st.id === s.id ? { ...st, students: { ...st.students!, grade_level: nextGrade } } : st));
      toast.success(`${s.full_name} promoted to ${nextGrade}`);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
  };

  const bulkPromote = async () => {
    if (selectedIds.size === 0 || !targetGrade) { toast.error("Select students and target grade"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/students/bulk", { action: "promote", userIds: Array.from(selectedIds), targetGrade });
      setStudents((prev) => prev.map((s) => selectedIds.has(s.id) ? { ...s, students: { ...s.students!, grade_level: targetGrade } } : s));
      setSelectedIds(new Set()); setShowBulkPromote(false);
      toast.success(`${selectedIds.size} students promoted to ${targetGrade}`);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const bulkTransfer = async () => {
    if (selectedIds.size === 0 || !targetClass) { toast.error("Select students and target class"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/students/bulk", { action: "transfer", userIds: Array.from(selectedIds), targetClass });
      setSelectedIds(new Set()); setShowBulkTransfer(false);
      toast.success(`${selectedIds.size} students transferred`);
      fetchStudents();
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const bulkArchive = async () => {
    if (selectedIds.size === 0) { toast.error("Select students first"); return; }
    if (!confirm(`Archive ${selectedIds.size} students? They will be marked as graduated.`)) return;
    setSaving(true);
    try {
      await apiPost("/api/admin/students/bulk", { action: "archive", userIds: Array.from(selectedIds) });
      setStudents((prev) => prev.map((s) => selectedIds.has(s.id) ? { ...s, is_active: false, students: { ...s.students!, status: "graduated" } } : s));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} students archived`);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const generatePassword = async (id: string) => {
    setGeneratingId(id);
    try {
      const data = await apiPost<{ credentials: { email: string; tempPassword: string } }>("/api/admin/students/generate-password", { id });
      setCredentials(data.credentials); setShowCredentials(true);
      toast.success("Temporary password generated");
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
    finally { setGeneratingId(null); }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const selectAll = () => {
    if (selectedIds.size === students.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(students.map((s) => s.id)));
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const stats = {
    total: students.length,
    active: students.filter((s) => s.is_active).length,
    inactive: students.filter((s) => !s.is_active).length,
    passwordPending: students.filter((s) => !s.password_changed).length,
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
          <h1 className="text-2xl font-bold text-slate-100">Student Management</h1>
          <p className="text-slate-400">Enroll, promote, transfer, and archive students</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStudents} variant="outline" className="border-slate-700/50 text-slate-300">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openCreate} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Enroll Student
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

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl">
            <span className="text-sm text-[#D4AF37] font-medium">{selectedIds.size} selected</span>
            <div className="flex-1" />
            <Button size="sm" onClick={() => setShowBulkPromote(true)}
              className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">
              <ArrowUpCircle className="w-4 h-4 mr-1" />
              Promote
            </Button>
            <Button size="sm" onClick={() => setShowBulkTransfer(true)}
              className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20">
              <Shuffle className="w-4 h-4 mr-1" />
              Transfer
            </Button>
            <Button size="sm" onClick={bulkArchive}
              className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20">
              <Archive className="w-4 h-4 mr-1" />
              Archive
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-slate-500">
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchStudents()}
            className="pl-10 bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600" />
        </div>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30">
          <option value="all">All Grades</option>
          {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button onClick={fetchStudents} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </motion.div>

      {/* Select All */}
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={selectedIds.size === students.length && students.length > 0} onChange={selectAll}
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-[#D4AF37] focus:ring-[#D4AF37]/30" />
        <span className="text-sm text-slate-500">Select all ({students.length})</span>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <GraduationCap className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-lg font-medium text-slate-400">No students found</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeader className="w-8"></TableHeader>
                  <TableHeader className="cursor-pointer" onClick={() => handleSort("full_name")}>Name {sortField === "full_name" && (sortDir === "asc" ? <ChevronUp className="inline w-3 h-3" /> : <ChevronDown className="inline w-3 h-3" />)}</TableHeader>
                  <TableHeader>Admission</TableHeader>
                  <TableHeader>Grade</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                <AnimatePresence>
                  {students.map((s, index) => (
                    <motion.tr key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }} transition={{ delay: index * 0.02 }}
                      className="hover:bg-slate-800/50 transition-colors">
                      <TableCell>
                        <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelection(s.id)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-[#D4AF37] focus:ring-[#D4AF37]/30" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700/50">
                            {s.avatar_url ? (
                              <Image src={s.avatar_url} alt={s.full_name} width={36} height={36} className="object-cover" />
                            ) : (
                              <GraduationCap className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-200">{s.full_name}</p>
                            <p className="text-xs text-slate-500">{s.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-slate-300">{s.students?.admission_number || "—"}</span></TableCell>
                      <TableCell><Badge variant="info">{s.students?.grade_level || "—"}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={s.is_active ? "success" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                        {!s.password_changed && <Badge variant="warning" className="ml-1.5">First Login</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openDetail(s)}
                            className="text-slate-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10" title="View Details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => promoteStudent(s)}
                            className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10" title="Promote">
                            <ArrowUpCircle className="w-4 h-4" />
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
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title="Enroll Student">
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
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Admission Number</label>
              <Input value={form.admission_number} onChange={(e) => setForm((f) => ({ ...f, admission_number: e.target.value }))}
                className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Grade Level</label>
              <select value={form.grade_level} onChange={(e) => setForm((f) => ({ ...f, grade_level: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select></div>
          </div>
          <div className="border-t border-slate-800 pt-4">
            <p className="text-sm font-medium text-slate-300 mb-2">Guardian Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Guardian Name</label>
                <Input value={form.guardian_name} onChange={(e) => setForm((f) => ({ ...f, guardian_name: e.target.value }))}
                  className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Guardian Phone</label>
                <Input value={form.guardian_phone} onChange={(e) => setForm((f) => ({ ...f, guardian_phone: e.target.value }))}
                  className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
              <div className="col-span-2"><label className="block text-sm font-medium text-slate-300 mb-1">Guardian Email</label>
                <Input type="email" value={form.guardian_email} onChange={(e) => setForm((f) => ({ ...f, guardian_email: e.target.value }))}
                  className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={() => { setShowCreate(false); resetForm(); }} variant="outline" className="flex-1 border-slate-700/50 text-slate-400">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enroll"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Student">
        {selectedStudent && (
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
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Admission Number</label>
                <Input value={form.admission_number} onChange={(e) => setForm((f) => ({ ...f, admission_number: e.target.value }))}
                  className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
              <div><label className="block text-sm font-medium text-slate-300 mb-1">Grade Level</label>
                <select value={form.grade_level} onChange={(e) => setForm((f) => ({ ...f, grade_level: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                  {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select></div>
            </div>
            <div className="border-t border-slate-800 pt-4">
              <p className="text-sm font-medium text-slate-300 mb-2">Guardian Information</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Guardian Name</label>
                  <Input value={form.guardian_name} onChange={(e) => setForm((f) => ({ ...f, guardian_name: e.target.value }))}
                    className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Guardian Phone</label>
                  <Input value={form.guardian_phone} onChange={(e) => setForm((f) => ({ ...f, guardian_phone: e.target.value }))}
                    className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-300 mb-1">Guardian Email</label>
                  <Input type="email" value={form.guardian_email} onChange={(e) => setForm((f) => ({ ...f, guardian_email: e.target.value }))}
                    className="bg-slate-900/60 border-slate-700/50 text-slate-100" /></div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={() => setShowEdit(false)} variant="outline" className="flex-1 border-slate-700/50 text-slate-400">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Bulk Promote Modal */}
      <Modal isOpen={showBulkPromote} onClose={() => setShowBulkPromote(false)} title="Bulk Promote">
        <div className="space-y-4">
          <p className="text-slate-400">Promote {selectedIds.size} students to:</p>
          <select value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
            <option value="">Select target grade</option>
            {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <div className="flex gap-3">
            <Button onClick={() => setShowBulkPromote(false)} variant="outline" className="flex-1 border-slate-700/50 text-slate-400">Cancel</Button>
            <Button onClick={bulkPromote} disabled={saving} className="flex-1 bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Promote"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Transfer Modal */}
      <Modal isOpen={showBulkTransfer} onClose={() => setShowBulkTransfer(false)} title="Bulk Transfer">
        <div className="space-y-4">
          <p className="text-slate-400">Transfer {selectedIds.size} students to class:</p>
          <select value={targetClass} onChange={(e) => setTargetClass(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
            <option value="">Select target class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.grade_level})</option>)}
          </select>
          <div className="flex gap-3">
            <Button onClick={() => setShowBulkTransfer(false)} variant="outline" className="flex-1 border-slate-700/50 text-slate-400">Cancel</Button>
            <Button onClick={bulkTransfer} disabled={saving} className="flex-1 bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Transfer"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Credentials Modal */}
      <Modal isOpen={showCredentials} onClose={() => setShowCredentials(false)} title="Temporary Credentials" size="sm">
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

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Student Profile" size="lg">
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border-2 border-[#D4AF37]/30">
                {selectedStudent.avatar_url ? (
                  <Image src={selectedStudent.avatar_url} alt={selectedStudent.full_name} width={64} height={64} className="rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-[#D4AF37]">{selectedStudent.full_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">{selectedStudent.full_name}</h3>
                <p className="text-slate-400">{selectedStudent.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={selectedStudent.is_active ? "success" : "secondary"}>{selectedStudent.is_active ? "Active" : "Inactive"}</Badge>
                  <Badge variant="info">{selectedStudent.students?.grade_level || "—"}</Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-1 border-b border-slate-800">
              {[
                { key: "profile", label: "Profile", icon: GraduationCap },
                { key: "academics", label: "Academics", icon: BookOpen },
                { key: "attendance", label: "Attendance", icon: Calendar },
                { key: "fees", label: "Fees", icon: BarChart3 },
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

            {detailTab === "profile" && (
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Admission</p><p className="text-slate-200">{selectedStudent.students?.admission_number || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Phone</p><p className="text-slate-200">{selectedStudent.phone || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Grade</p><p className="text-slate-200">{selectedStudent.students?.grade_level || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Class</p><p className="text-slate-200">{selectedStudent.students?.class_name || selectedStudent.students?.class_id || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Guardian</p><p className="text-slate-200">{selectedStudent.students?.guardian_name || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Guardian Phone</p><p className="text-slate-200">{selectedStudent.students?.guardian_phone || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Guardian Email</p><p className="text-slate-200">{selectedStudent.students?.guardian_email || "—"}</p></Card>
                <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Enrolled</p><p className="text-slate-200">{selectedStudent.students?.enrollment_date ? new Date(selectedStudent.students.enrollment_date).toLocaleDateString() : "—"}</p></Card>
              </div>
            )}

            {detailTab === "academics" && (
              <div className="text-center py-8 text-slate-500">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>Academic records will appear here</p>
              </div>
            )}

            {detailTab === "attendance" && (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>Attendance records will appear here</p>
              </div>
            )}

            {detailTab === "fees" && (
              <div className="text-center py-8 text-slate-500">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>Fee records will appear here</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
