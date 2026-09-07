"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Building2, Plus, MapPin, Phone, Mail, Loader2, Search, Pencil,
  Trash2, X, Users, GraduationCap, Briefcase, AlertTriangle, RefreshCw,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface Campus {
  id: string;
  name: string;
  location: string;
  phone: string | null;
  email: string | null;
  headteacher_id: string | null;
  headteacher_name?: string | null;
  is_active: boolean;
  created_at: string;
  student_count?: number;
  staff_count?: number;
}

export default function CampusesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    location: "",
    phone: "",
    email: "",
    is_active: true,
  });

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchCampuses = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await apiGet<{ campuses: Campus[] }>("/api/admin/campuses");
      setCampuses(data.campuses || []);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.user_category === "admin") fetchCampuses();
  }, [user, fetchCampuses]);

  const resetForm = () => {
    setForm({ name: "", location: "", phone: "", email: "", is_active: true });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (campus: Campus) => {
    setForm({
      name: campus.name,
      location: campus.location,
      phone: campus.phone || "",
      email: campus.email || "",
      is_active: campus.is_active !== false,
    });
    setEditingId(campus.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim()) {
      toast.error("Name and location are required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiPut("/api/admin/campuses", { id: editingId, ...form });
        toast.success("Campus updated");
      } else {
        await apiPost("/api/admin/campuses", form);
        toast.success("Campus created");
      }
      resetForm();
      setShowForm(false);
      fetchCampuses();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campus? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      await apiDelete(`/api/admin/campuses?id=${id}`);
      setCampuses((prev) => prev.filter((c) => c.id !== id));
      toast.success("Campus deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = campuses.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.location.toLowerCase().includes(search.toLowerCase())
  );

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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Campus Management</h1>
          <p className="text-slate-400">Manage school campuses and locations</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchCampuses} variant="outline" className="border-slate-700/50 text-slate-300">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openCreate} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Add Campus
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <p className="text-2xl font-bold text-slate-100">{campuses.length}</p>
              <p className="text-xs text-slate-500">Total Campuses</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-slate-100">
                {campuses.reduce((sum, c) => sum + (c.student_count || 0), 0)}
              </p>
              <p className="text-xs text-slate-500">Total Students</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-slate-100">
                {campuses.reduce((sum, c) => sum + (c.staff_count || 0), 0)}
              </p>
              <p className="text-xs text-slate-500">Total Staff</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-slate-100">
                {campuses.filter((c) => c.is_active).length}
              </p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search campuses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600"
        />
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      {/* Campus Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <AnimatePresence>
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full flex flex-col items-center justify-center py-16 text-slate-500"
            >
              <Building2 className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-lg font-medium text-slate-400">No campuses found</p>
              <p className="text-sm">Add your first campus to get started</p>
              <Button onClick={openCreate} className="mt-4 bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Add Campus
              </Button>
            </motion.div>
          ) : (
            filtered.map((campus, index) => (
              <motion.div
                key={campus.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-5 hover:border-[#D4AF37]/30 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-100">{campus.name}</h3>
                        <Badge variant={campus.is_active ? "success" : "secondary"}>
                          {campus.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await apiPut("/api/admin/campuses", { id: campus.id, is_active: !campus.is_active });
                            setCampuses((prev) => prev.map((c) => c.id === campus.id ? { ...c, is_active: !c.is_active } : c));
                            toast.success(campus.is_active ? "Campus deactivated" : "Campus activated");
                          } catch (err: unknown) {
                            toast.error(getErrorMessage(err));
                          }
                        }}
                        className={campus.is_active ? "text-emerald-400 hover:text-amber-400 hover:bg-amber-500/10" : "text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"}
                        title={campus.is_active ? "Deactivate" : "Activate"}
                      >
                        {campus.is_active ? <CheckCircle className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(campus)}
                        className="text-slate-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(campus.id)}
                        disabled={deletingId === campus.id}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        {deletingId === campus.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-4 h-4 text-slate-600" />
                      <span>{campus.location}</span>
                    </div>
                    {campus.phone && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone className="w-4 h-4 text-slate-600" />
                        <span>{campus.phone}</span>
                      </div>
                    )}
                    {campus.email && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Mail className="w-4 h-4 text-slate-600" />
                        <span>{campus.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>{campus.student_count || 0} students</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>{campus.staff_count || 0} staff</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); resetForm(); }}
        title={editingId ? "Edit Campus" : "Add Campus"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Campus Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Main Campus"
              className="bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Location *</label>
            <Input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g., Nairobi, Kenya"
              className="bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+254..."
              className="bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="campus@bdja.edu"
              className="bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              variant="outline"
              className="flex-1 border-slate-700/50 text-slate-400"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
