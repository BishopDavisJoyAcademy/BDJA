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
  Loader2, Plus, Pencil, Trash2, Users, X, CheckCircle, Search,
  Power, PowerOff, Eye, RefreshCw, Mail, Phone, Baby, Link2,
  Unlink, MessageSquare, AlertTriangle, User, GraduationCap, Send
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface ParentRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  password_changed: boolean;
  created_at: string;
  last_login_at: string | null;
  avatar_url: string | null;
}

interface ChildLink {
  id: string;
  student_id: string;
  relationship: string | null;
  is_primary: boolean | null;
  student_name?: string;
  student_admission?: string;
  student_grade?: string;
}

interface ActivityRecord {
  id: string;
  action: string;
  table_name: string | null;
  created_at: string;
}

interface StudentOption {
  id: string;
  full_name: string;
  admission_number: string;
  grade_level: string | null;
}

const RELATIONSHIPS = ["Father", "Mother", "Guardian", "Uncle", "Aunt", "Grandparent", "Other"];

export default function ParentsManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [parents, setParents] = useState<ParentRecord[]>([]);
  const [childrenCounts, setChildrenCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showLinkStudent, setShowLinkStudent] = useState(false);
  const [showBulkMessage, setShowBulkMessage] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentRecord | null>(null);
  const [selectedParentIds, setSelectedParentIds] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailTab, setDetailTab] = useState<"profile" | "children" | "activity">("profile");

  const [children, setChildren] = useState<ChildLink[]>([]);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [linkForm, setLinkForm] = useState({ student_id: "", relationship: "Guardian", is_primary: false });
  const [bulkMessage, setBulkMessage] = useState({ subject: "", message: "" });

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchParents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());

      const data = await apiGet<{ parents: ParentRecord[]; childrenCounts: Record<string, number> }>(`/api/admin/parents?${params.toString()}`);
      setParents(data.parents || []);
      setChildrenCounts(data.childrenCounts || {});
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  const fetchStudents = useCallback(async () => {
    try {
      const data = await apiGet<{ students: StudentOption[] }>("/api/admin/students?status=active");
      setStudents(data.students?.map((s: Record<string, unknown>) => ({
        id: String(s.id),
        full_name: String(s.full_name || ""),
        admission_number: String((s.students as Record<string, unknown> | null)?.admission_number || ""),
        grade_level: String((s.students as Record<string, unknown> | null)?.grade_level || ""),
      })) || []);
    } catch (err: unknown) {
      console.error("Failed to load students:", err);
    }
  }, []);

  useEffect(() => {
    if (user?.user_category === "admin") {
      fetchParents();
      fetchStudents();
    }
  }, [user, fetchParents, fetchStudents]);

  const resetForm = () => {
    setForm({ full_name: "", email: "", phone: "" });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error("Full name is required"); return; }
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/parents", {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone || null,
      });
      toast.success("Parent account created");
      resetForm();
      setShowCreate(false);
      fetchParents();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParent) return;
    setSaving(true);
    try {
      await apiPatch("/api/admin/parents", {
        id: selectedParent.id,
        full_name: form.full_name.trim(),
        phone: form.phone || null,
      });
      toast.success("Parent updated");
      setShowEdit(false);
      setSelectedParent(null);
      fetchParents();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this parent account?")) return;
    setDeletingId(id);
    try {
      await apiDelete(`/api/admin/parents?id=${id}`);
      setParents((prev) => prev.filter((p) => p.id !== id));
      toast.success("Parent deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (parent: ParentRecord) => {
    setTogglingId(parent.id);
    try {
      await apiPatch("/api/admin/parents", { id: parent.id, is_active: !parent.is_active });
      setParents((prev) => prev.map((p) => p.id === parent.id ? { ...p, is_active: !p.is_active } : p));
      toast.success(`${parent.full_name} is now ${!parent.is_active ? "active" : "inactive"}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const openEdit = (parent: ParentRecord) => {
    setSelectedParent(parent);
    setForm({ full_name: parent.full_name, email: parent.email, phone: parent.phone || "" });
    setShowEdit(true);
  };

  const openDetail = async (parent: ParentRecord) => {
    setSelectedParent(parent);
    setDetailTab("profile");
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const data = await apiGet<{ parent: ParentRecord; children: ChildLink[] | null; activity: ActivityRecord[] | null }>(`/api/admin/parents?id=${parent.id}&children=true&activity=true`);
      setChildren(data.children || []);
      setActivity(data.activity || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingDetail(false);
    }
  };

  const openLinkStudent = (parent: ParentRecord) => {
    setSelectedParent(parent);
    setLinkForm({ student_id: "", relationship: "Guardian", is_primary: false });
    setShowLinkStudent(true);
  };

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParent) return;
    if (!linkForm.student_id) { toast.error("Select a student"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/parents", {
        action: "link_student",
        parent_id: selectedParent.id,
        student_id: linkForm.student_id,
        relationship: linkForm.relationship,
        is_primary: linkForm.is_primary,
      });
      toast.success("Student linked successfully");
      setShowLinkStudent(false);
      if (showDetail) {
        const data = await apiGet<{ children: ChildLink[] }>(`/api/admin/parents?id=${selectedParent.id}&children=true`);
        setChildren(data.children || []);
      }
      fetchParents();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkStudent = async (linkId: string) => {
    if (!confirm("Remove this student link?")) return;
    try {
      await apiPost("/api/admin/parents", { action: "unlink_student", link_id: linkId });
      setChildren((prev) => prev.filter((c) => c.id !== linkId));
      toast.success("Student unlinked");
      fetchParents();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleBulkMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedParentIds.size === 0) { toast.error("Select at least one parent"); return; }
    if (!bulkMessage.subject.trim()) { toast.error("Subject is required"); return; }
    if (!bulkMessage.message.trim()) { toast.error("Message is required"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/parents", {
        action: "bulk_message",
        parent_ids: Array.from(selectedParentIds),
        subject: bulkMessage.subject.trim(),
        message: bulkMessage.message.trim(),
      });
      toast.success(`Message sent to ${selectedParentIds.size} parent(s)`);
      setShowBulkMessage(false);
      setSelectedParentIds(new Set());
      setBulkMessage({ subject: "", message: "" });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedParentIds.size === parents.length) {
      setSelectedParentIds(new Set());
    } else {
      setSelectedParentIds(new Set(parents.map((p) => p.id)));
    }
  };

  const stats = {
    total: parents.length,
    active: parents.filter((p) => p.is_active).length,
    inactive: parents.filter((p) => !p.is_active).length,
    withChildren: parents.filter((p) => (childrenCounts[p.id] || 0) > 0).length,
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
          <h1 className="text-2xl font-bold text-slate-100">Parent Management</h1>
          <p className="text-slate-400">Manage parent accounts and student links</p>
        </div>
        <div className="flex gap-2">
          {selectedParentIds.size > 0 && (
            <Button onClick={() => setShowBulkMessage(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
              <Send className="w-4 h-4 mr-2" />
              Message ({selectedParentIds.size})
            </Button>
          )}
          <Button onClick={() => { resetForm(); setShowCreate(true); }} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            New Parent
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Parents", value: stats.total, icon: Users, color: "text-[#D4AF37]" },
          { label: "Active", value: stats.active, icon: Power, color: "text-emerald-400" },
          { label: "Inactive", value: stats.inactive, icon: PowerOff, color: "text-red-400" },
          { label: "With Children", value: stats.withChildren, icon: Baby, color: "text-blue-400" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 flex items-center gap-3 bg-slate-900/60 border-slate-700/50 rounded-2xl">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
            <div>
              <p className="text-xl font-bold text-slate-100">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search parents..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchParents()} className="pl-10 bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600 rounded-xl" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button onClick={fetchParents} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold rounded-xl">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="overflow-hidden bg-slate-900/60 border-slate-700/50 rounded-2xl">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : parents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Users className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-lg font-medium text-slate-400">No parents found</p>
              <p className="text-sm">Create a parent account to get started</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeader className="w-8">
                    <input type="checkbox" checked={selectedParentIds.size === parents.length && parents.length > 0} onChange={toggleAll} className="rounded border-slate-600 bg-slate-800 text-[#D4AF37] focus:ring-[#D4AF37]/30" />
                  </TableHeader>
                  <TableHeader>Parent</TableHeader>
                  <TableHeader>Contact</TableHeader>
                  <TableHeader>Children</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Last Login</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                <AnimatePresence>
                  {parents.map((parent, index) => (
                    <motion.tr key={parent.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: index * 0.02 }} className="hover:bg-slate-800/50 transition-colors">
                      <TableCell>
                        <input type="checkbox" checked={selectedParentIds.has(parent.id)} onChange={() => toggleSelection(parent.id)} className="rounded border-slate-600 bg-slate-800 text-[#D4AF37] focus:ring-[#D4AF37]/30" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700/50">
                            {parent.avatar_url ? (
                              <Image src={parent.avatar_url} alt={parent.full_name} width={36} height={36} className="object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-200">{parent.full_name}</p>
                            <p className="text-xs text-slate-500">{parent.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {parent.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            {parent.phone}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Baby className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-slate-300">{childrenCounts[parent.id] || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={parent.is_active ? "success" : "secondary"}>{parent.is_active ? "Active" : "Inactive"}</Badge>
                        {!parent.password_changed && (
                          <Badge variant="warning" className="ml-1.5">First Login</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400">
                          {parent.last_login_at ? new Date(parent.last_login_at).toLocaleDateString() : "Never"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openDetail(parent)} className="text-slate-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openLinkStudent(parent)} className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10">
                            <Link2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(parent)} className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(parent)} disabled={togglingId === parent.id} className={parent.is_active ? "text-emerald-400 hover:text-red-400 hover:bg-red-500/10" : "text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"}>
                            {togglingId === parent.id ? <Loader2 className="w-4 h-4 animate-spin" /> : parent.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(parent.id)} disabled={deletingId === parent.id} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                            {deletingId === parent.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title="Create Parent Account" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Full Name *</label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. John Doe" required className="bg-slate-900/60 border-slate-700/50" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email *</label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="parent@example.com" required className="bg-slate-900/60 border-slate-700/50" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254..." className="bg-slate-900/60 border-slate-700/50" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Create Account
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetForm(); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => { setShowEdit(false); setSelectedParent(null); }} title="Edit Parent" size="md">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Full Name</label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="bg-slate-900/60 border-slate-700/50" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-slate-900/60 border-slate-700/50" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Update Parent
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowEdit(false); setSelectedParent(null); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Link Student Modal */}
      <Modal isOpen={showLinkStudent} onClose={() => { setShowLinkStudent(false); setSelectedParent(null); }} title={`Link Student to ${selectedParent?.full_name}`} size="md">
        <form onSubmit={handleLinkStudent} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Student *</label>
            <select value={linkForm.student_id} onChange={(e) => setLinkForm({ ...linkForm, student_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm" required>
              <option value="">Select student</option>
              {students.map((s) => (<option key={s.id} value={s.id}>{s.full_name} ({s.admission_number}) {s.grade_level ? `- ${s.grade_level}` : ""}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Relationship</label>
            <select value={linkForm.relationship} onChange={(e) => setLinkForm({ ...linkForm, relationship: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
              {RELATIONSHIPS.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_primary" checked={linkForm.is_primary} onChange={(e) => setLinkForm({ ...linkForm, is_primary: e.target.checked })} className="rounded border-slate-600 bg-slate-800 text-[#D4AF37]" />
            <label htmlFor="is_primary" className="text-sm text-slate-300">Primary contact for this student</label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Link2 className="w-4 h-4 mr-1" />}
              Link Student
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowLinkStudent(false); setSelectedParent(null); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Message Modal */}
      <Modal isOpen={showBulkMessage} onClose={() => { setShowBulkMessage(false); setBulkMessage({ subject: "", message: "" }); }} title={`Send Message to ${selectedParentIds.size} Parent(s)`} size="md">
        <form onSubmit={handleBulkMessage} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Subject *</label>
            <Input value={bulkMessage.subject} onChange={(e) => setBulkMessage({ ...bulkMessage, subject: e.target.value })} placeholder="Message subject..." required className="bg-slate-900/60 border-slate-700/50" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Message *</label>
            <textarea value={bulkMessage.message} onChange={(e) => setBulkMessage({ ...bulkMessage, message: e.target.value })} placeholder="Type your message..." required rows={4} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Send Message
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowBulkMessage(false); setBulkMessage({ subject: "", message: "" }); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => { setShowDetail(false); setSelectedParent(null); }} title={selectedParent?.full_name || "Parent Details"} size="lg">
        {loadingDetail ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : selectedParent && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["profile", "children", "activity"] as const).map((tab) => (
                <button key={tab} onClick={() => setDetailTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${detailTab === tab ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "text-slate-400 hover:text-slate-200"}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {detailTab === "profile" && (
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase">Email</p>
                  <p className="text-slate-200 font-medium">{selectedParent.email}</p>
                </Card>
                <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase">Phone</p>
                  <p className="text-slate-200 font-medium">{selectedParent.phone || "—"}</p>
                </Card>
                <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase">Status</p>
                  <Badge variant={selectedParent.is_active ? "success" : "secondary"}>{selectedParent.is_active ? "Active" : "Inactive"}</Badge>
                </Card>
                <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase">Children</p>
                  <p className="text-slate-200 font-medium">{children.length}</p>
                </Card>
              </div>
            )}

            {detailTab === "children" && (
              <div className="space-y-2">
                {children.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Baby className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p>No children linked</p>
                  </div>
                ) : (
                  <Table>
                    <TableHead>
                      <tr><TableHeader>Student</TableHeader><TableHeader>Relationship</TableHeader><TableHeader>Primary</TableHeader><TableHeader className="text-right">Actions</TableHeader></tr>
                    </TableHead>
                    <TableBody>
                      {children.map((child) => (
                        <tr key={child.id} className="hover:bg-slate-800/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
                              <span className="text-slate-200">{child.student_name || child.student_id}</span>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-slate-300">{child.relationship || "—"}</span></TableCell>
                          <TableCell>{child.is_primary ? <Badge variant="success">Yes</Badge> : <span className="text-slate-500">No</span>}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => handleUnlinkStudent(child.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                              <Unlink className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </tr>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {detailTab === "activity" && (
              <div className="space-y-2">
                {activity.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p>No activity recorded</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {activity.map((act) => (
                      <div key={act.id} className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-300">{act.action}</p>
                          {act.table_name && <p className="text-xs text-slate-500">Table: {act.table_name}</p>}
                        </div>
                        <span className="text-xs text-slate-500">{new Date(act.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
