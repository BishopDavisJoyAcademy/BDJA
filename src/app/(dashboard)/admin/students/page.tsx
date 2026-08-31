"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Loader2, Plus, Pencil, Trash2, GraduationCap, Key, X, CheckCircle, Search,
  Filter, Power, PowerOff, Eye, Copy, Check, Mail, MessageCircle,
  RefreshCw, ChevronDown, ChevronUp, AlertTriangle, TrendingUp,
  UserCheck, UserX, BookOpen
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ADMIN_SEGMENT } from "@/lib/constants";

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  password_changed: boolean;
  created_at: string | null;
  students?: {
    admission_number: string;
    grade_level: string;
    class_id: string | null;
    enrollment_date: string | null;
    status: string;
  };
}

interface CredentialData {
  id: string;
  fullName: string;
  email: string;
  tempPassword: string;
  phone: string | null;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  firstLogin: number;
}

const GRADES = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];
type StatusFilter = "all" | "active" | "inactive";
type SortField = "name" | "admission" | "grade" | "status" | "created";
type SortDir = "asc" | "desc";

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [credentials, setCredentials] = useState<CredentialData | null>(null);
  const [copied, setCopied] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [newGrade, setNewGrade] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, firstLogin: 0 });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterGrade !== "all") params.set("grade", filterGrade);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());

      const endpoint = `/api/admin/students${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await apiGet<{ students: StudentProfile[]; count: number }>(endpoint);
      const list = data.students || [];
      setStudents(list);

      const activeCount = list.filter((s) => s.is_active).length;
      const firstLoginCount = list.filter((s) => !s.password_changed).length;
      setStats({
        total: list.length,
        active: activeCount,
        inactive: list.length - activeCount,
        firstLogin: firstLoginCount,
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [filterGrade, statusFilter, search]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleToggleStatus = async (student: StudentProfile) => {
    const newStatus = !student.is_active;
    setTogglingId(student.id);
    try {
      await apiPatch("/api/admin/students", { id: student.id, is_active: newStatus });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id ? { ...s, is_active: newStatus, students: { ...s.students, status: newStatus ? "active" : "inactive" } as StudentProfile["students"] } : s
        )
      );
      toast.success(`${student.full_name} is now ${newStatus ? "active" : "inactive"}`);
      setStats((prev) => ({
        ...prev,
        active: newStatus ? prev.active + 1 : prev.active - 1,
        inactive: newStatus ? prev.inactive - 1 : prev.inactive + 1,
      }));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (student: StudentProfile) => {
    if (!confirm(`Delete "${student.full_name}" permanently? This cannot be undone.`)) return;
    setDeletingId(student.id);
    try {
      await apiDelete(`/api/admin/students?id=${student.id}`);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      toast.success(`${student.full_name} deleted`);
      setStats((prev) => ({
        total: prev.total - 1,
        active: student.is_active ? prev.active - 1 : prev.active,
        inactive: !student.is_active ? prev.inactive - 1 : prev.inactive,
        firstLogin: !student.password_changed ? prev.firstLogin - 1 : prev.firstLogin,
      }));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handlePromote = async (id: string) => {
    if (!newGrade) { toast.error("Select a new grade level"); return; }
    try {
      await apiPatch("/api/admin/students", { id, new_grade_level: newGrade });
      toast.success("Student promoted successfully");
      setPromotingId(null);
      setNewGrade("");
      fetchStudents();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleGenerateCredentials = async (student: StudentProfile) => {
    setGeneratingId(student.id);
    try {
      const data = await apiPost<{ success: boolean; credentials: CredentialData; message: string }>(
        "/api/admin/students/credentials",
        { id: student.id }
      );
      setCredentials(data.credentials);
      toast.success("New credentials generated");
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, password_changed: false } : s))
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setGeneratingId(null);
    }
  };

  const handleCopyCredentials = async () => {
    if (!credentials) return;
    const text = `BDJA Student Account\n\nName: ${credentials.fullName}\nEmail: ${credentials.email}\nTemporary Password: ${credentials.tempPassword}\n\nPlease log in and change your password immediately.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleWhatsAppShare = () => {
    if (!credentials?.phone) {
      toast.error("No phone number available");
      return;
    }
    const clean = credentials.phone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Hello ${credentials.fullName}, your BDJA student account has been created!\n\nEmail: ${credentials.email}\nTemp Password: ${credentials.tempPassword}\n\nPlease log in and change your password immediately.`
    );
    window.open(`https://wa.me/${clean}?text=${text}`, "_blank");
  };

  const handleEmailShare = () => {
    if (!credentials) return;
    const subject = encodeURIComponent("Your BDJA Student Account");
    const body = encodeURIComponent(
      `Hello ${credentials.fullName},\n\nYour BDJA student account has been created!\n\nEmail: ${credentials.email}\nTemporary Password: ${credentials.tempPassword}\n\nPlease log in and change your password immediately.\n\n- BDJA Admin`
    );
    window.open(`mailto:${credentials.email}?subject=${subject}&body=${body}`, "_blank");
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedStudents = [...students].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "name":
        return a.full_name.localeCompare(b.full_name) * dir;
      case "admission":
        return (a.students?.admission_number || "").localeCompare(b.students?.admission_number || "") * dir;
      case "grade":
        return (a.students?.grade_level || "").localeCompare(b.students?.grade_level || "") * dir;
      case "status":
        return (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1) * dir;
      case "created":
      default:
        return ((a.created_at || "") > (b.created_at || "") ? 1 : -1) * dir;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Student Management</h1>
          <p className="text-sm text-gray-400 mt-1">Manage student records, grades, and credentials</p>
        </div>
        <Link href={`/${ADMIN_SEGMENT}/students/create`}>
          <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/20">
            <Plus className="w-4 h-4 mr-2" />Add Student
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-800/50 border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400"><GraduationCap className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-400">Total Students</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-800/50 border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400"><UserCheck className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.active}</p>
              <p className="text-xs text-gray-400">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-800/50 border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400"><UserX className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.inactive}</p>
              <p className="text-xs text-gray-400">Inactive</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-800/50 border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400"><Key className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.firstLogin}</p>
              <p className="text-xs text-gray-400">First Login</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, admission number, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800/50 border-slate-700"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500/50"
          >
            <option value="all">All Grades</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStudents} className="border-slate-600 text-gray-300 hover:bg-slate-700">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Credentials Banner */}
      {credentials && (
        <Card className="p-5 border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <Button size="sm" variant="ghost" onClick={() => setCredentials(null)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"><Key className="w-5 h-5" /></div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
                Generated Credentials — {credentials.fullName}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/50">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm text-white font-medium">{credentials.email}</p>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-lg border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 mb-1">Temporary Password</p>
                  <p className="text-sm text-white font-mono tracking-wide">{credentials.tempPassword}</p>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/50">
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <p className="text-sm text-white font-medium">{credentials.phone || "—"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={handleCopyCredentials} className="border-slate-600 text-gray-300 hover:bg-slate-700">
                  {copied ? <><Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
                </Button>
                {credentials.phone && (
                  <Button size="sm" variant="outline" onClick={handleWhatsAppShare} className="border-slate-600 text-gray-300 hover:bg-slate-700">
                    <MessageCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" /> WhatsApp
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleEmailShare} className="border-slate-600 text-gray-300 hover:bg-slate-700">
                  <Mail className="w-3.5 h-3.5 mr-1 text-blue-400" /> Email
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Students Table */}
      <Card className="overflow-hidden border-slate-700/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80 text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("name")}>
                  <div className="flex items-center gap-1">Name {sortField === "name" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("admission")}>
                  <div className="flex items-center gap-1">Admission # {sortField === "admission" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("grade")}>
                  <div className="flex items-center gap-1">Grade {sortField === "grade" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("status")}>
                  <div className="flex items-center gap-1">Status {sortField === "status" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedStudents.map((s) => (
                <>
                  <tr key={s.id} className={`text-gray-300 transition-colors ${expandedId === s.id ? "bg-slate-800/40" : "hover:bg-slate-800/30"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${s.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-400"}`}>
                          {s.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{s.full_name}</p>
                          <p className="text-xs text-gray-500">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-400">{s.students?.admission_number || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                        <span>{s.students?.grade_level || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={`text-xs border-0 ${s.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {s.is_active ? <><CheckCircle className="w-3 h-3 mr-1" />Active</> : <><PowerOff className="w-3 h-3 mr-1" />Inactive</>}
                        </Badge>
                        {!s.password_changed && (
                          <Badge className="bg-amber-500/10 text-amber-400 border-0 text-xs">
                            <Key className="w-3 h-3 mr-1" />First Login
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} className="text-gray-400 hover:text-white">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Link href={`/${ADMIN_SEGMENT}/students/edit/${s.id}`}>
                          <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setPromotingId(promotingId === s.id ? null : s.id); setNewGrade(""); }}
                          className="text-amber-400 hover:text-amber-300"
                        >
                          <GraduationCap className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(s)}
                          disabled={togglingId === s.id}
                          className={s.is_active ? "text-red-400 hover:text-red-300" : "text-emerald-400 hover:text-emerald-300"}
                        >
                          {togglingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : s.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleGenerateCredentials(s)}
                          disabled={generatingId === s.id}
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          {generatingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(s)}
                          disabled={deletingId === s.id}
                          className="text-red-400 hover:text-red-300"
                        >
                          {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                      {promotingId === s.id && (
                        <div className="mt-2 flex items-center gap-2 justify-end">
                          <select value={newGrade} onChange={(e) => setNewGrade(e.target.value)} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500/50">
                            <option value="">Select grade</option>
                            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                          </select>
                          <Button size="sm" onClick={() => handlePromote(s.id)}>Promote</Button>
                          <Button size="sm" variant="outline" onClick={() => setPromotingId(null)}>Cancel</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedId === s.id && (
                    <tr className="bg-slate-800/20">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Contact</p>
                            <p className="text-gray-300"><span className="text-gray-500">Email:</span> {s.email}</p>
                            <p className="text-gray-300"><span className="text-gray-500">Phone:</span> {s.phone || "—"}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Academic</p>
                            <p className="text-gray-300"><span className="text-gray-500">Admission #:</span> {s.students?.admission_number || "—"}</p>
                            <p className="text-gray-300"><span className="text-gray-500">Grade:</span> {s.students?.grade_level || "—"}</p>
                            <p className="text-gray-300"><span className="text-gray-500">Class ID:</span> {s.students?.class_id || "—"}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Account</p>
                            <p className="text-gray-300"><span className="text-gray-500">Password Changed:</span> {s.password_changed ? "Yes" : "No (First Login)"}</p>
                            <p className="text-gray-300"><span className="text-gray-500">Account Status:</span> {s.is_active ? "Active" : "Inactive"}</p>
                            <p className="text-gray-300"><span className="text-gray-500">Enrolled:</span> {s.students?.enrollment_date || "—"}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {sortedStudents.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No students found</p>
            <p className="text-sm mt-1">{search || filterGrade !== "all" ? "Try adjusting your search or filters" : "Add your first student to get started"}</p>
          </div>
        )}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        )}
      </Card>

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to load students</p>
            <p className="text-sm mt-1">{error}</p>
            <Button onClick={fetchStudents} className="mt-3" size="sm" variant="outline">
              <RefreshCw className="w-3 h-3 mr-1" /> Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
