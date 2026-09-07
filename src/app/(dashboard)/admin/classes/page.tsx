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
  Filter, Power, PowerOff, Eye, ChevronDown, ChevronUp, RefreshCw,
  GraduationCap, Building2, BookOpen, UserCheck, DoorOpen, Hash,
  AlertTriangle, School, ArrowUpDown, MapPin
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface ClassRecord {
  id: string;
  name: string;
  grade_level: string;
  stream: string | null;
  campus_id: string;
  campus_name?: string | null;
  class_teacher_id: string | null;
  class_teacher_name?: string | null;
  class_teacher_email?: string | null;
  capacity: number | null;
  room: string | null;
  academic_year: string;
  is_active: boolean;
  created_at: string;
}

interface SubjectAssignment {
  id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  teacher_id: string | null;
  teacher_name?: string | null;
}

interface StudentRoster {
  id: string;
  admission_number: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  grade_level: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
}

interface Campus {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

const GRADE_LEVELS = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

export default function ClassesManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [campusFilter, setCampusFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showAssignSubjects, setShowAssignSubjects] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassRecord | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailTab, setDetailTab] = useState<"overview" | "subjects" | "roster">("overview");

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([]);
  const [roster, setRoster] = useState<StudentRoster[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [form, setForm] = useState({
    name: "",
    grade_level: "Grade 1",
    campus_id: "",
    class_teacher_id: "",
    stream: "",
    capacity: "",
    room: "",
    academic_year: "2024-2025",
  });

  const [subjectForm, setSubjectForm] = useState<Array<{ subject_id: string; teacher_id: string }>>([]);

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchClasses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (campusFilter !== "all") params.set("campus", campusFilter);
      if (gradeFilter !== "all") params.set("grade", gradeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());
      params.set("sort", sortField);
      params.set("dir", sortDir);

      const data = await apiGet<{ classes: ClassRecord[]; studentCounts: Record<string, number> }>(`/api/admin/classes?${params.toString()}`);
      setClasses(data.classes || []);
      setStudentCounts(data.studentCounts || {});
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [campusFilter, gradeFilter, statusFilter, search, sortField, sortDir]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [campusesRes, teachersRes, subjectsRes] = await Promise.all([
        apiGet<{ campuses: Campus[] }>("/api/admin/campuses"),
        apiGet<{ staff: Teacher[] }>("/api/admin/staff?status=active"),
        apiGet<{ subjects: Subject[] }>("/api/admin/subjects"),
      ]);
      setCampuses(campusesRes.campuses || []);
      setTeachers((teachersRes.staff || []).map((t: Record<string, unknown>) => ({
        id: String(t.id),
        full_name: String(t.full_name || ""),
        email: String(t.email || ""),
        department: String((t.staff as Record<string, unknown> | null)?.department || ""),
      })));
      setSubjects(subjectsRes.subjects || []);
    } catch (err: unknown) {
      console.error("Failed to load reference data:", err);
    }
  }, []);

  useEffect(() => {
    if (user?.user_category === "admin") {
      fetchClasses();
      fetchReferenceData();
    }
  }, [user, fetchClasses, fetchReferenceData]);

  const resetForm = () => {
    setForm({
      name: "",
      grade_level: "Grade 1",
      campus_id: campuses[0]?.id || "",
      class_teacher_id: "",
      stream: "",
      capacity: "",
      room: "",
      academic_year: "2024-2025",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Class name is required"); return; }
    if (!form.campus_id) { toast.error("Campus is required"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/classes", {
        name: form.name.trim(),
        grade_level: form.grade_level,
        campus_id: form.campus_id,
        class_teacher_id: form.class_teacher_id || null,
        stream: form.stream || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        room: form.room || null,
        academic_year: form.academic_year,
      });
      toast.success("Class created successfully");
      resetForm();
      setShowCreate(false);
      fetchClasses();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    if (!form.name.trim()) { toast.error("Class name is required"); return; }
    setSaving(true);
    try {
      await apiPatch("/api/admin/classes", {
        id: selectedClass.id,
        name: form.name.trim(),
        grade_level: form.grade_level,
        campus_id: form.campus_id,
        class_teacher_id: form.class_teacher_id || null,
        stream: form.stream || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        room: form.room || null,
        academic_year: form.academic_year,
      });
      toast.success("Class updated successfully");
      setShowEdit(false);
      setSelectedClass(null);
      fetchClasses();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this class? Students must be transferred first.")) return;
    setDeletingId(id);
    try {
      await apiDelete(`/api/admin/classes?id=${id}`);
      setClasses((prev) => prev.filter((c) => c.id !== id));
      toast.success("Class deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (cls: ClassRecord) => {
    setTogglingId(cls.id);
    try {
      await apiPatch("/api/admin/classes", { id: cls.id, is_active: !cls.is_active });
      setClasses((prev) => prev.map((c) => c.id === cls.id ? { ...c, is_active: !c.is_active } : c));
      toast.success(`${cls.name} is now ${!cls.is_active ? "active" : "inactive"}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const openEdit = (cls: ClassRecord) => {
    setSelectedClass(cls);
    setForm({
      name: cls.name,
      grade_level: cls.grade_level,
      campus_id: cls.campus_id,
      class_teacher_id: cls.class_teacher_id || "",
      stream: cls.stream || "",
      capacity: cls.capacity ? String(cls.capacity) : "",
      room: cls.room || "",
      academic_year: cls.academic_year,
    });
    setShowEdit(true);
  };

  const openDetail = async (cls: ClassRecord) => {
    setSelectedClass(cls);
    setDetailTab("overview");
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const data = await apiGet<{ class: ClassRecord; subjectAssignments: SubjectAssignment[]; roster: StudentRoster[] | null }>(`/api/admin/classes?id=${cls.id}&roster=true`);
      setSubjectAssignments(data.subjectAssignments || []);
      setRoster(data.roster || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingDetail(false);
    }
  };

  const openAssignSubjects = (cls: ClassRecord) => {
    setSelectedClass(cls);
    setSubjectForm([{ subject_id: "", teacher_id: "" }]);
    setShowAssignSubjects(true);
  };

  const handleAssignSubjects = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    const validAssignments = subjectForm.filter((a) => a.subject_id);
    if (validAssignments.length === 0) { toast.error("Select at least one subject"); return; }
    setSaving(true);
    try {
      await apiPost("/api/admin/classes", {
        action: "assign_subjects",
        class_id: selectedClass.id,
        assignments: validAssignments,
      });
      toast.success("Subjects assigned successfully");
      setShowAssignSubjects(false);
      if (showDetail) {
        const data = await apiGet<{ subjectAssignments: SubjectAssignment[] }>(`/api/admin/classes?id=${selectedClass.id}&roster=true`);
        setSubjectAssignments(data.subjectAssignments || []);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubject = async (assignmentId: string) => {
    if (!confirm("Remove this subject assignment?")) return;
    try {
      await apiPost("/api/admin/classes", {
        action: "remove_subject",
        assignment_id: assignmentId,
      });
      setSubjectAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast.success("Subject removed");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const addSubjectRow = () => {
    setSubjectForm((prev) => [...prev, { subject_id: "", teacher_id: "" }]);
  };

  const removeSubjectRow = (index: number) => {
    setSubjectForm((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSubjectRow = (index: number, field: "subject_id" | "teacher_id", value: string) => {
    setSubjectForm((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const stats = {
    total: classes.length,
    active: classes.filter((c) => c.is_active).length,
    inactive: classes.filter((c) => !c.is_active).length,
    totalStudents: Object.values(studentCounts).reduce((a, b) => a + b, 0),
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
          <h1 className="text-2xl font-bold text-slate-100">Class Management</h1>
          <p className="text-slate-400">Manage classes, assign teachers, and view rosters</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          New Class
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Classes", value: stats.total, icon: School, color: "text-[#D4AF37]" },
          { label: "Active", value: stats.active, icon: Power, color: "text-emerald-400" },
          { label: "Inactive", value: stats.inactive, icon: PowerOff, color: "text-red-400" },
          { label: "Total Students", value: stats.totalStudents, icon: Users, color: "text-blue-400" },
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
          <Input placeholder="Search classes..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchClasses()} className="pl-10 bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600 rounded-xl" />
        </div>
        <select value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30">
          <option value="all">All Campuses</option>
          {campuses.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30">
          <option value="all">All Grades</option>
          {GRADE_LEVELS.map((g) => (<option key={g} value={g}>{g}</option>))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button onClick={fetchClasses} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold rounded-xl">
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
          ) : classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <School className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-lg font-medium text-slate-400">No classes found</p>
              <p className="text-sm">Create your first class to get started</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeader className="cursor-pointer" onClick={() => handleSort("name")}>Class {sortField === "name" && (sortDir === "asc" ? <ChevronUp className="inline w-3 h-3" /> : <ChevronDown className="inline w-3 h-3" />)}</TableHeader>
                  <TableHeader className="cursor-pointer" onClick={() => handleSort("grade_level")}>Grade {sortField === "grade_level" && (sortDir === "asc" ? <ChevronUp className="inline w-3 h-3" /> : <ChevronDown className="inline w-3 h-3" />)}</TableHeader>
                  <TableHeader>Campus</TableHeader>
                  <TableHeader>Teacher</TableHeader>
                  <TableHeader>Students</TableHeader>
                  <TableHeader>Capacity</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                <AnimatePresence>
                  {classes.map((cls, index) => (
                    <motion.tr key={cls.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: index * 0.02 }} className="hover:bg-slate-800/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <School className="w-4 h-4 text-[#D4AF37]" />
                          <div>
                            <p className="font-medium text-slate-200">{cls.name}</p>
                            {cls.stream && <p className="text-xs text-slate-500">Stream: {cls.stream}</p>}
                            {cls.room && <p className="text-xs text-slate-500">Room: {cls.room}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="info">{cls.grade_level}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {cls.campus_name || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cls.class_teacher_name ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-slate-300">{cls.class_teacher_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-slate-300">{studentCounts[cls.id] || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cls.capacity ? (
                          <span className="text-slate-300">{studentCounts[cls.id] || 0} / {cls.capacity}</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cls.is_active ? "success" : "secondary"}>{cls.is_active ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openDetail(cls)} className="text-slate-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openAssignSubjects(cls)} className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10">
                            <BookOpen className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(cls)} className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(cls)} disabled={togglingId === cls.id} className={cls.is_active ? "text-emerald-400 hover:text-red-400 hover:bg-red-500/10" : "text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"}>
                            {togglingId === cls.id ? <Loader2 className="w-4 h-4 animate-spin" /> : cls.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(cls.id)} disabled={deletingId === cls.id} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                            {deletingId === cls.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title="Create New Class" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Class Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grade 1A" required className="bg-slate-900/60 border-slate-700/50" />
            </div>
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
              <label className="block text-sm text-slate-400 mb-1">Class Teacher</label>
              <select value={form.class_teacher_id} onChange={(e) => setForm({ ...form, class_teacher_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                <option value="">Unassigned</option>
                {teachers.map((t) => (<option key={t.id} value={t.id}>{t.full_name} {t.department ? `(${t.department})` : ""}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Stream</label>
              <Input value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value })} placeholder="e.g. Red, Blue" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Room</label>
              <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. Room 101" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Capacity</label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="e.g. 30" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Academic Year *</label>
              <Input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="e.g. 2024-2025" required className="bg-slate-900/60 border-slate-700/50" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Create Class
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetForm(); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => { setShowEdit(false); setSelectedClass(null); }} title="Edit Class" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Class Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grade 1A" required className="bg-slate-900/60 border-slate-700/50" />
            </div>
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
              <label className="block text-sm text-slate-400 mb-1">Class Teacher</label>
              <select value={form.class_teacher_id} onChange={(e) => setForm({ ...form, class_teacher_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                <option value="">Unassigned</option>
                {teachers.map((t) => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Stream</label>
              <Input value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value })} placeholder="e.g. Red, Blue" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Room</label>
              <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. Room 101" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Capacity</label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="e.g. 30" className="bg-slate-900/60 border-slate-700/50" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Academic Year *</label>
              <Input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="e.g. 2024-2025" required className="bg-slate-900/60 border-slate-700/50" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Update Class
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowEdit(false); setSelectedClass(null); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Subjects Modal */}
      <Modal isOpen={showAssignSubjects} onClose={() => { setShowAssignSubjects(false); setSelectedClass(null); }} title={`Assign Subjects - ${selectedClass?.name}`} size="lg">
        <form onSubmit={handleAssignSubjects} className="space-y-4">
          <AnimatePresence>
            {subjectForm.map((row, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm text-slate-400 mb-1">Subject</label>
                  <select value={row.subject_id} onChange={(e) => updateSubjectRow(index, "subject_id", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                    <option value="">Select subject</option>
                    {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ""}</option>))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-slate-400 mb-1">Teacher (Optional)</label>
                  <select value={row.teacher_id} onChange={(e) => updateSubjectRow(index, "teacher_id", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm">
                    <option value="">Unassigned</option>
                    {teachers.map((t) => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
                  </select>
                </div>
                <Button type="button" variant="ghost" onClick={() => removeSubjectRow(index)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 mb-0.5">
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
          <Button type="button" variant="outline" onClick={addSubjectRow} className="border-slate-700/50 text-slate-300">
            <Plus className="w-4 h-4 mr-1" /> Add Subject
          </Button>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Assign Subjects
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowAssignSubjects(false); setSelectedClass(null); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => { setShowDetail(false); setSelectedClass(null); }} title={selectedClass?.name || "Class Details"} size="xl">
        {loadingDetail ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : selectedClass && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["overview", "subjects", "roster"] as const).map((tab) => (
                <button key={tab} onClick={() => setDetailTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${detailTab === tab ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "text-slate-400 hover:text-slate-200"}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {detailTab === "overview" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase">Grade</p>
                  <p className="text-lg font-semibold text-slate-200">{selectedClass.grade_level}</p>
                </Card>
                <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase">Campus</p>
                  <p className="text-lg font-semibold text-slate-200">{selectedClass.campus_name || "—"}</p>
                </Card>
                <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase">Class Teacher</p>
                  <p className="text-lg font-semibold text-slate-200">{selectedClass.class_teacher_name || "Unassigned"}</p>
                </Card>
                <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase">Students</p>
                  <p className="text-lg font-semibold text-slate-200">{studentCounts[selectedClass.id] || 0}</p>
                </Card>
                <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase">Capacity</p>
                  <p className="text-lg font-semibold text-slate-200">{selectedClass.capacity || "—"}</p>
                </Card>
                <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase">Room</p>
                  <p className="text-lg font-semibold text-slate-200">{selectedClass.room || "—"}</p>
                </Card>
              </div>
            )}

            {detailTab === "subjects" && (
              <div className="space-y-2">
                {subjectAssignments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p>No subjects assigned yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHead>
                      <tr><TableHeader>Subject</TableHeader><TableHeader>Teacher</TableHeader><TableHeader className="text-right">Actions</TableHeader></tr>
                    </TableHead>
                    <TableBody>
                      {subjectAssignments.map((sa) => (
                        <tr key={sa.id} className="hover:bg-slate-800/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                              <span className="text-slate-200">{sa.subject_name || sa.subject_id}</span>
                            </div>
                          </TableCell>
                          <TableCell>{sa.teacher_name ? <span className="text-slate-300">{sa.teacher_name}</span> : <span className="text-slate-500 italic">Unassigned</span>}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => handleRemoveSubject(sa.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </tr>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {detailTab === "roster" && (
              <div className="space-y-2">
                {roster.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p>No students enrolled</p>
                  </div>
                ) : (
                  <Table>
                    <TableHead>
                      <tr><TableHeader>Student</TableHeader><TableHeader>Admission #</TableHeader><TableHeader>Guardian</TableHeader><TableHeader>Contact</TableHeader></tr>
                    </TableHead>
                    <TableBody>
                      {roster.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-800/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700/50">
                                {s.avatar_url ? <Image src={s.avatar_url} alt={s.full_name} width={32} height={32} className="object-cover" /> : <GraduationCap className="w-4 h-4 text-slate-400" />}
                              </div>
                              <span className="text-slate-200">{s.full_name}</span>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-slate-300">{s.admission_number}</span></TableCell>
                          <TableCell><span className="text-slate-300">{s.guardian_name || "—"}</span></TableCell>
                          <TableCell><span className="text-slate-300">{s.guardian_phone || "—"}</span></TableCell>
                        </tr>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
