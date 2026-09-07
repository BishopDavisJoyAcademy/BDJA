"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHead, TableBody, TableCell, TableHeader } from "@/components/ui/Table";
import {
  Loader2, Plus, Pencil, Trash2, X, CheckCircle, Search, DollarSign,
  CreditCard, Receipt, Send, AlertTriangle, Eye, GraduationCap, Building2,
  Calendar, ChevronDown, ChevronUp, Users, FileText, Bell
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface FeeStructure {
  id: string;
  grade_level: string;
  campus_id: string;
  campus_name?: string;
  academic_year: string;
  term: string;
  tuition: number;
  transport: number | null;
  activity_fees: number | null;
  uniform: number | null;
  other_fees: Record<string, number> | null;
  total: number | null;
  created_at: string;
}

interface FeePayment {
  id: string;
  student_id: string;
  student_name?: string;
  amount: number;
  payment_method: string;
  receipt_number: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
}

interface FeeReminder {
  id: string;
  student_id: string;
  student_name?: string;
  reminder_type: string;
  message: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  grade_level: string;
}

interface Campus {
  id: string;
  name: string;
}

const TERMS = ["Term 1", "Term 2", "Term 3"];
const GRADE_LEVELS = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Mobile Money", "Cheque", "Card"];

export default function FeesManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [campusFilter, setCampusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showSendReminder, setShowSendReminder] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<FeeStructure | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [reminders, setReminders] = useState<FeeReminder[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [form, setForm] = useState({
    grade_level: "Grade 1",
    campus_id: "",
    academic_year: "2024-2025",
    term: "Term 1",
    tuition: "",
    transport: "",
    activity_fees: "",
    uniform: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    student_id: "",
    amount: "",
    payment_method: "Cash",
    receipt_number: "",
    notes: "",
  });

  const [reminderForm, setReminderForm] = useState({
    student_id: "",
    reminder_type: "upcoming",
    message: "",
  });

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchFeeStructures = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (gradeFilter !== "all") params.set("grade", gradeFilter);
      if (campusFilter !== "all") params.set("campus", campusFilter);
      if (yearFilter !== "all") params.set("year", yearFilter);
      if (termFilter !== "all") params.set("term", termFilter);

      const data = await apiGet<{ feeStructures: FeeStructure[] }>(`/api/admin/fees?${params.toString()}`);
      setFeeStructures(data.feeStructures || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [gradeFilter, campusFilter, yearFilter, termFilter]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [campusesRes, studentsRes] = await Promise.all([
        apiGet<{ campuses: Campus[] }>("/api/admin/campuses"),
        apiGet<{ students: Array<{ id: string; full_name: string; students?: { admission_number?: string; grade_level?: string } }> }>("/api/admin/students?status=active"),
      ]);
      setCampuses(campusesRes.campuses || []);
      setStudents((studentsRes.students || []).map((s) => ({
        id: s.id,
        full_name: s.full_name || "",
        admission_number: s.students?.admission_number || "",
        grade_level: s.students?.grade_level || "",
      })));
    } catch (err: unknown) {
      console.error("Failed to load reference data:", err);
    }
  }, []);

  useEffect(() => {
    if (user?.user_category === "admin") {
      fetchFeeStructures();
      fetchReferenceData();
    }
  }, [user, fetchFeeStructures, fetchReferenceData]);

  const resetForm = () => {
    setForm({
      grade_level: "Grade 1",
      campus_id: campuses[0]?.id || "",
      academic_year: "2024-2025",
      term: "Term 1",
      tuition: "",
      transport: "",
      activity_fees: "",
      uniform: "",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.campus_id) { toast.error("Campus is required"); return; }
    if (!form.tuition || Number(form.tuition) < 0) { toast.error("Valid tuition amount is required"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/fees", {
        grade_level: form.grade_level,
        campus_id: form.campus_id,
        academic_year: form.academic_year,
        term: form.term,
        tuition: Number(form.tuition),
        transport: form.transport ? Number(form.transport) : null,
        activity_fees: form.activity_fees ? Number(form.activity_fees) : null,
        uniform: form.uniform ? Number(form.uniform) : null,
      });
      toast.success("Fee structure created");
      resetForm();
      setShowCreate(false);
      fetchFeeStructures();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStructure) return;
    setSaving(true);
    try {
      await apiPatch("/api/admin/fees", {
        id: selectedStructure.id,
        grade_level: form.grade_level,
        campus_id: form.campus_id,
        academic_year: form.academic_year,
        term: form.term,
        tuition: Number(form.tuition),
        transport: form.transport ? Number(form.transport) : null,
        activity_fees: form.activity_fees ? Number(form.activity_fees) : null,
        uniform: form.uniform ? Number(form.uniform) : null,
      });
      toast.success("Fee structure updated");
      setShowEdit(false);
      setSelectedStructure(null);
      fetchFeeStructures();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this fee structure?")) return;
    setDeletingId(id);
    try {
      await apiDelete(`/api/admin/fees?id=${id}`);
      setFeeStructures((prev) => prev.filter((f) => f.id !== id));
      toast.success("Fee structure deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (fs: FeeStructure) => {
    setSelectedStructure(fs);
    setForm({
      grade_level: fs.grade_level,
      campus_id: fs.campus_id,
      academic_year: fs.academic_year,
      term: fs.term,
      tuition: String(fs.tuition),
      transport: fs.transport ? String(fs.transport) : "",
      activity_fees: fs.activity_fees ? String(fs.activity_fees) : "",
      uniform: fs.uniform ? String(fs.uniform) : "",
    });
    setShowEdit(true);
  };

  const openDetail = async (fs: FeeStructure) => {
    setSelectedStructure(fs);
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const data = await apiGet<{ feeStructure: FeeStructure; payments: FeePayment[]; reminders: FeeReminder[] }>(`/api/admin/fees?id=${fs.id}&payments=true&reminders=true`);
      setPayments(data.payments || []);
      setReminders(data.reminders || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingDetail(false);
    }
  };

  const openRecordPayment = (fs: FeeStructure) => {
    setSelectedStructure(fs);
    setPaymentForm({ student_id: "", amount: "", payment_method: "Cash", receipt_number: "", notes: "" });
    setShowRecordPayment(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStructure) return;
    if (!paymentForm.student_id) { toast.error("Select a student"); return; }
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) { toast.error("Valid amount is required"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/fees", {
        action: "record_payment",
        student_id: paymentForm.student_id,
        fee_structure_id: selectedStructure.id,
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        receipt_number: paymentForm.receipt_number || null,
        notes: paymentForm.notes || null,
      });
      toast.success("Payment recorded");
      setShowRecordPayment(false);
      if (showDetail) {
        const data = await apiGet<{ payments: FeePayment[] }>(`/api/admin/fees?id=${selectedStructure.id}&payments=true`);
        setPayments(data.payments || []);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openSendReminder = (fs: FeeStructure) => {
    setSelectedStructure(fs);
    setReminderForm({ student_id: "", reminder_type: "upcoming", message: `Reminder: ${fs.term} fees for ${fs.grade_level} are due. Total: ${fs.total}` });
    setShowSendReminder(true);
  };

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStructure) return;
    if (!reminderForm.student_id) { toast.error("Select a student"); return; }
    if (!reminderForm.message.trim()) { toast.error("Message is required"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/fees", {
        action: "send_reminder",
        fee_structure_id: selectedStructure.id,
        student_id: reminderForm.student_id,
        reminder_type: reminderForm.reminder_type,
        message: reminderForm.message.trim(),
      });
      toast.success("Reminder sent");
      setShowSendReminder(false);
      if (showDetail) {
        const data = await apiGet<{ reminders: FeeReminder[] }>(`/api/admin/fees?id=${selectedStructure.id}&reminders=true`);
        setReminders(data.reminders || []);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: feeStructures.length,
    totalExpected: feeStructures.reduce((sum, f) => sum + (f.total || 0), 0),
    totalCollected: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    outstanding: feeStructures.reduce((sum, f) => sum + (f.total || 0), 0) - payments.reduce((sum, p) => sum + (p.amount || 0), 0),
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
          <h1 className="text-2xl font-bold text-slate-100">Fee Management</h1>
          <p className="text-slate-400">Manage fee structures, track payments, and send reminders</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          New Fee Structure
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Structures", value: stats.total, icon: FileText, color: "text-[#D4AF37]" },
          { label: "Total Expected", value: `KES ${stats.totalExpected.toLocaleString()}`, icon: DollarSign, color: "text-blue-400" },
          { label: "Collected", value: `KES ${stats.totalCollected.toLocaleString()}`, icon: CreditCard, color: "text-emerald-400" },
          { label: "Outstanding", value: `KES ${stats.outstanding.toLocaleString()}`, icon: AlertTriangle, color: "text-red-400" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 flex items-center gap-3 bg-slate-900/60 border-slate-700/50 rounded-2xl">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
            <div>
              <p className="text-lg font-bold text-slate-100">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search fee structures..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600 rounded-xl" />
        </div>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
          <option value="all">All Grades</option>
          {GRADE_LEVELS.map((g) => (<option key={g} value={g}>{g}</option>))}
        </select>
        <select value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
          <option value="all">All Campuses</option>
          {campuses.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        <select value={termFilter} onChange={(e) => setTermFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
          <option value="all">All Terms</option>
          {TERMS.map((t) => (<option key={t} value={t}>{t}</option>))}
        </select>
        <Button onClick={fetchFeeStructures} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold rounded-xl">
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
          ) : feeStructures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <DollarSign className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-lg font-medium text-slate-400">No fee structures found</p>
              <p className="text-sm">Create your first fee structure to get started</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeader>Grade</TableHeader>
                  <TableHeader>Campus</TableHeader>
                  <TableHeader>Year / Term</TableHeader>
                  <TableHeader>Tuition</TableHeader>
                  <TableHeader>Total</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                <AnimatePresence>
                  {feeStructures.map((fs, index) => (
                    <motion.tr key={fs.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: index * 0.02 }} className="hover:bg-slate-800/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
                          <span className="font-medium text-slate-200">{fs.grade_level}</span>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-slate-300">{fs.campus_name || "—"}</span></TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-slate-200">{fs.academic_year}</span>
                          <Badge variant="info" className="w-fit mt-0.5">{fs.term}</Badge>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-slate-300">KES {fs.tuition.toLocaleString()}</span></TableCell>
                      <TableCell><span className="font-semibold text-[#D4AF37]">KES {(fs.total || 0).toLocaleString()}</span></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openDetail(fs)} className="text-slate-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openRecordPayment(fs)} className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10">
                            <CreditCard className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openSendReminder(fs)} className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10">
                            <Bell className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(fs)} className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(fs.id)} disabled={deletingId === fs.id} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                            {deletingId === fs.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title="Create Fee Structure" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Grade Level *</label>
              <select value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                {GRADE_LEVELS.map((g) => (<option key={g} value={g}>{g}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Campus *</label>
              <select value={form.campus_id} onChange={(e) => setForm({ ...form, campus_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm" required>
                <option value="">Select campus</option>
                {campuses.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Academic Year *</label>
              <Input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="e.g. 2024-2025" required className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Term *</label>
              <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                {TERMS.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Tuition (KES) *</label>
              <Input type="number" value={form.tuition} onChange={(e) => setForm({ ...form, tuition: e.target.value })} placeholder="e.g. 15000" required className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Transport (KES)</label>
              <Input type="number" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} placeholder="e.g. 3000" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Activity Fees (KES)</label>
              <Input type="number" value={form.activity_fees} onChange={(e) => setForm({ ...form, activity_fees: e.target.value })} placeholder="e.g. 2000" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Uniform (KES)</label>
              <Input type="number" value={form.uniform} onChange={(e) => setForm({ ...form, uniform: e.target.value })} placeholder="e.g. 5000" className="bg-slate-900/60 border-slate-700/50" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Create Structure
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetForm(); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => { setShowEdit(false); setSelectedStructure(null); }} title="Edit Fee Structure" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Grade Level *</label>
              <select value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                {GRADE_LEVELS.map((g) => (<option key={g} value={g}>{g}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Campus *</label>
              <select value={form.campus_id} onChange={(e) => setForm({ ...form, campus_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm" required>
                {campuses.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Academic Year *</label>
              <Input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} required className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Term *</label>
              <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                {TERMS.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Tuition (KES) *</label>
              <Input type="number" value={form.tuition} onChange={(e) => setForm({ ...form, tuition: e.target.value })} required className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Transport (KES)</label>
              <Input type="number" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Activity Fees (KES)</label>
              <Input type="number" value={form.activity_fees} onChange={(e) => setForm({ ...form, activity_fees: e.target.value })} className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Uniform (KES)</label>
              <Input type="number" value={form.uniform} onChange={(e) => setForm({ ...form, uniform: e.target.value })} className="bg-slate-900/60 border-slate-700/50" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Update Structure
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowEdit(false); setSelectedStructure(null); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={showRecordPayment} onClose={() => { setShowRecordPayment(false); setSelectedStructure(null); }} title={`Record Payment - ${selectedStructure?.grade_level}`} size="md">
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Student *</label>
            <select value={paymentForm.student_id} onChange={(e) => setPaymentForm({ ...paymentForm, student_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm" required>
              <option value="">Select student</option>
              {students.filter((s) => s.grade_level === selectedStructure?.grade_level).map((s) => (
                <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Amount (KES) *</label>
            <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder={`Total due: KES ${selectedStructure?.total || 0}`} required className="bg-slate-900/60 border-slate-700/50" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Payment Method *</label>
            <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
              {PAYMENT_METHODS.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Receipt Number</label>
            <Input value={paymentForm.receipt_number} onChange={(e) => setPaymentForm({ ...paymentForm, receipt_number: e.target.value })} placeholder="e.g. RCP-001" className="bg-slate-900/60 border-slate-700/50" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Notes</label>
            <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Additional notes..." rows={2} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CreditCard className="w-4 h-4 mr-1" />}
              Record Payment
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowRecordPayment(false); setSelectedStructure(null); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Send Reminder Modal */}
      <Modal isOpen={showSendReminder} onClose={() => { setShowSendReminder(false); setSelectedStructure(null); }} title={`Send Reminder - ${selectedStructure?.grade_level}`} size="md">
        <form onSubmit={handleSendReminder} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Student *</label>
            <select value={reminderForm.student_id} onChange={(e) => setReminderForm({ ...reminderForm, student_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm" required>
              <option value="">Select student</option>
              {students.filter((s) => s.grade_level === selectedStructure?.grade_level).map((s) => (
                <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Reminder Type</label>
            <select value={reminderForm.reminder_type} onChange={(e) => setReminderForm({ ...reminderForm, reminder_type: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
              <option value="upcoming">Upcoming</option>
              <option value="overdue">Overdue</option>
              <option value="final">Final Notice</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Message *</label>
            <textarea value={reminderForm.message} onChange={(e) => setReminderForm({ ...reminderForm, message: e.target.value })} placeholder="Reminder message..." required rows={3} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Send Reminder
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowSendReminder(false); setSelectedStructure(null); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => { setShowDetail(false); setSelectedStructure(null); }} title={`${selectedStructure?.grade_level} - ${selectedStructure?.term}`} size="xl">
        {loadingDetail ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : selectedStructure && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                <p className="text-xs text-slate-500 uppercase">Tuition</p>
                <p className="text-lg font-semibold text-slate-200">KES {selectedStructure.tuition.toLocaleString()}</p>
              </Card>
              <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                <p className="text-xs text-slate-500 uppercase">Transport</p>
                <p className="text-lg font-semibold text-slate-200">KES {(selectedStructure.transport || 0).toLocaleString()}</p>
              </Card>
              <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                <p className="text-xs text-slate-500 uppercase">Activities</p>
                <p className="text-lg font-semibold text-slate-200">KES {(selectedStructure.activity_fees || 0).toLocaleString()}</p>
              </Card>
              <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                <p className="text-xs text-slate-500 uppercase">Total</p>
                <p className="text-lg font-semibold text-[#D4AF37]">KES {(selectedStructure.total || 0).toLocaleString()}</p>
              </Card>
            </div>

            {/* Payments */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Payments ({payments.length})
              </h4>
              {payments.length === 0 ? (
                <div className="text-center py-6 text-slate-500 bg-slate-900/40 rounded-xl">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>No payments recorded yet</p>
                </div>
              ) : (
                <Table>
                  <TableHead>
                    <tr><TableHeader>Student</TableHeader><TableHeader>Amount</TableHeader><TableHeader>Method</TableHeader><TableHeader>Receipt</TableHeader><TableHeader>Date</TableHeader></tr>
                  </TableHead>
                  <TableBody>
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/50">
                        <TableCell><span className="text-slate-200">{p.student_name || p.student_id}</span></TableCell>
                        <TableCell><span className="text-emerald-400 font-medium">KES {p.amount.toLocaleString()}</span></TableCell>
                        <TableCell><Badge variant="info">{p.payment_method}</Badge></TableCell>
                        <TableCell><span className="text-slate-400">{p.receipt_number || "—"}</span></TableCell>
                        <TableCell><span className="text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</span></TableCell>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Reminders */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" />
                Reminders ({reminders.length})
              </h4>
              {reminders.length === 0 ? (
                <div className="text-center py-6 text-slate-500 bg-slate-900/40 rounded-xl">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>No reminders sent yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {reminders.map((r) => (
                    <div key={r.id} className="p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <Badge variant={r.reminder_type === "overdue" ? "danger" : r.reminder_type === "final" ? "warning" : "info"}>{r.reminder_type}</Badge>
                        <span className="text-xs text-slate-500">{r.sent_at ? new Date(r.sent_at).toLocaleDateString() : "Pending"}</span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">{r.message || "No message"}</p>
                      <p className="text-xs text-slate-500">To: {r.student_name || r.student_id}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
