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
import { Table, TableHead, TableBody, TableCell, TableHeader } from "@/components/ui/Table";
import {
  BookOpen, Plus, Trash2, Edit3, X, Save, Search, Loader2, CheckCircle, XCircle,
  GraduationCap, Hash, FileText, Layers, Eye, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  grade_levels: string[] | null;
  description: string | null;
  grading_scales: GradingScale[] | null;
  curriculum_strands: CurriculumStrand[] | null;
  created_at: string;
}

interface GradingScale {
  name: string;
  min: number;
  max: number;
  grade: string;
  description?: string;
}

interface CurriculumStrand {
  name: string;
  description?: string;
  sub_strands?: string[];
}

interface LinkedClass {
  id: string;
  name: string;
  grade_level: string;
  teacher_name: string | null;
}

const ALL_GRADES = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];

const DEFAULT_GRADING_SCALES: GradingScale[] = [
  { name: "Exceeding Expectations", min: 80, max: 100, grade: "EE", description: "Outstanding performance" },
  { name: "Meeting Expectations", min: 65, max: 79, grade: "ME", description: "Good understanding" },
  { name: "Approaching Expectations", min: 50, max: 64, grade: "AE", description: "Developing understanding" },
  { name: "Below Expectations", min: 0, max: 49, grade: "BE", description: "Needs improvement" },
];

export default function SubjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [linkedClasses, setLinkedClasses] = useState<LinkedClass[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    grade_levels: [] as string[],
    description: "",
    grading_scales: [] as GradingScale[],
    curriculum_strands: [] as CurriculumStrand[],
  });

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ subjects: Subject[] }>("/api/admin/subjects");
      setSubjects(data.subjects || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.user_category === "admin") {
      fetchSubjects();
    }
  }, [user, fetchSubjects]);

  const resetForm = () => {
    setForm({ name: "", code: "", grade_levels: [], description: "", grading_scales: [], curriculum_strands: [] });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Subject name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code || null,
        grade_levels: form.grade_levels.length > 0 ? form.grade_levels : null,
        description: form.description || null,
        grading_scales: form.grading_scales.length > 0 ? form.grading_scales : null,
        curriculum_strands: form.curriculum_strands.length > 0 ? form.curriculum_strands : null,
      };
      if (editingId) {
        await apiPut("/api/admin/subjects", { id: editingId, ...payload });
        toast.success("Subject updated");
      } else {
        await apiPost("/api/admin/subjects", payload);
        toast.success("Subject created");
      }
      resetForm();
      setShowForm(false);
      fetchSubjects();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subject?")) return;
    try {
      await apiDelete(`/api/admin/subjects?id=${id}`);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      toast.success("Subject deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleEdit = (sub: Subject) => {
    setForm({
      name: sub.name,
      code: sub.code || "",
      grade_levels: sub.grade_levels || [],
      description: sub.description || "",
      grading_scales: sub.grading_scales || [],
      curriculum_strands: sub.curriculum_strands || [],
    });
    setEditingId(sub.id);
    setShowForm(true);
  };

  const openDetail = async (sub: Subject) => {
    setSelectedSubject(sub);
    setShowDetail(true);
    setLoadingDetail(true);
    try {
      const data = await apiGet<{ subject: Subject; linkedClasses: LinkedClass[] }>(`/api/admin/subjects?id=${sub.id}&linked=true`);
      setLinkedClasses(data.linkedClasses || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleGrade = (grade: string) => {
    setForm((prev) => ({
      ...prev,
      grade_levels: prev.grade_levels.includes(grade)
        ? prev.grade_levels.filter((g) => g !== grade)
        : [...prev.grade_levels, grade],
    }));
  };

  const addGradingScale = () => {
    setForm((prev) => ({
      ...prev,
      grading_scales: [...prev.grading_scales, { name: "", min: 0, max: 100, grade: "", description: "" }],
    }));
  };

  const updateGradingScale = (index: number, field: keyof GradingScale, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      grading_scales: prev.grading_scales.map((g, i) => i === index ? { ...g, [field]: value } : g),
    }));
  };

  const removeGradingScale = (index: number) => {
    setForm((prev) => ({
      ...prev,
      grading_scales: prev.grading_scales.filter((_, i) => i !== index),
    }));
  };

  const loadDefaultGradingScales = () => {
    setForm((prev) => ({ ...prev, grading_scales: [...DEFAULT_GRADING_SCALES] }));
  };

  const addCurriculumStrand = () => {
    setForm((prev) => ({
      ...prev,
      curriculum_strands: [...prev.curriculum_strands, { name: "", description: "", sub_strands: [] }],
    }));
  };

  const updateCurriculumStrand = (index: number, field: keyof CurriculumStrand, value: string | string[]) => {
    setForm((prev) => ({
      ...prev,
      curriculum_strands: prev.curriculum_strands.map((s, i) => i === index ? { ...s, [field]: value } : s),
    }));
  };

  const removeCurriculumStrand = (index: number) => {
    setForm((prev) => ({
      ...prev,
      curriculum_strands: prev.curriculum_strands.filter((_, i) => i !== index),
    }));
  };

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.code || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.description || "").toLowerCase().includes(search.toLowerCase())
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Subject Management</h1>
          <p className="text-slate-400">Manage subjects, grading scales, and curriculum strands</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
          {showForm ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> Add Subject</>}
        </Button>
      </motion.div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-6 bg-slate-900/60 border-slate-700/50 rounded-2xl">
              <h3 className="font-semibold text-white mb-4">{editingId ? "Edit Subject" : "New Subject"}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Subject Name *</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" required className="bg-slate-900/60 border-slate-700/50" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Subject Code</label>
                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH-101" className="bg-slate-900/60 border-slate-700/50" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">Description</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the subject..." rows={2} className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 resize-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-400 mb-2">Grade Levels</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_GRADES.map((g) => (
                        <button key={g} type="button" onClick={() => toggleGrade(g)} className={`px-3 py-1 rounded-full text-xs transition-colors ${form.grade_levels.includes(g) ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30" : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500"}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Grading Scales */}
                <div className="border-t border-slate-700/50 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#D4AF37]" />
                      Grading Scales
                    </h4>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={loadDefaultGradingScales} className="border-slate-700/50 text-slate-400 text-xs">
                        Load Defaults
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={addGradingScale} className="border-slate-700/50 text-slate-400 text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {form.grading_scales.map((scale, index) => (
                      <motion.div key={index} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="grid grid-cols-12 gap-2 mb-2 items-end">
                        <div className="col-span-3">
                          <Input value={scale.name} onChange={(e) => updateGradingScale(index, "name", e.target.value)} placeholder="Name" className="bg-slate-900/60 border-slate-700/50 text-xs" />
                        </div>
                        <div className="col-span-2">
                          <Input type="number" value={scale.min} onChange={(e) => updateGradingScale(index, "min", Number(e.target.value))} placeholder="Min" className="bg-slate-900/60 border-slate-700/50 text-xs" />
                        </div>
                        <div className="col-span-2">
                          <Input type="number" value={scale.max} onChange={(e) => updateGradingScale(index, "max", Number(e.target.value))} placeholder="Max" className="bg-slate-900/60 border-slate-700/50 text-xs" />
                        </div>
                        <div className="col-span-2">
                          <Input value={scale.grade} onChange={(e) => updateGradingScale(index, "grade", e.target.value)} placeholder="Grade" className="bg-slate-900/60 border-slate-700/50 text-xs" />
                        </div>
                        <div className="col-span-2">
                          <Input value={scale.description} onChange={(e) => updateGradingScale(index, "description", e.target.value)} placeholder="Desc" className="bg-slate-900/60 border-slate-700/50 text-xs" />
                        </div>
                        <div className="col-span-1">
                          <Button type="button" size="sm" variant="ghost" onClick={() => removeGradingScale(index)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Curriculum Strands */}
                <div className="border-t border-slate-700/50 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#D4AF37]" />
                      Curriculum Strands
                    </h4>
                    <Button type="button" size="sm" variant="outline" onClick={addCurriculumStrand} className="border-slate-700/50 text-slate-400 text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Add Strand
                    </Button>
                  </div>
                  <AnimatePresence>
                    {form.curriculum_strands.map((strand, index) => (
                      <motion.div key={index} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="grid grid-cols-12 gap-2 mb-2 items-end">
                        <div className="col-span-4">
                          <Input value={strand.name} onChange={(e) => updateCurriculumStrand(index, "name", e.target.value)} placeholder="Strand name" className="bg-slate-900/60 border-slate-700/50 text-xs" />
                        </div>
                        <div className="col-span-6">
                          <Input value={strand.description} onChange={(e) => updateCurriculumStrand(index, "description", e.target.value)} placeholder="Description" className="bg-slate-900/60 border-slate-700/50 text-xs" />
                        </div>
                        <div className="col-span-1">
                          <Button type="button" size="sm" variant="ghost" onClick={() => removeCurriculumStrand(index)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
                    {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    {editingId ? "Update Subject" : "Save Subject"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="border-slate-700/50 text-slate-300">Cancel</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-2xl">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search subjects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <BookOpen className="w-12 h-12 mb-3 text-slate-600" />
            <p className="text-lg font-medium text-slate-400">No subjects found</p>
            <p className="text-sm">Add a subject to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <tr>
                  <TableHeader>Subject</TableHeader>
                  <TableHeader>Code</TableHeader>
                  <TableHeader>Grades</TableHeader>
                  <TableHeader>Grading</TableHeader>
                  <TableHeader>Strands</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                <AnimatePresence>
                  {filtered.map((s, index) => (
                    <motion.tr key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: index * 0.02 }} className="hover:bg-slate-800/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                          <div>
                            <p className="font-medium text-slate-200">{s.name}</p>
                            {s.description && <p className="text-xs text-slate-500 truncate max-w-[200px]">{s.description}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-slate-400">{s.code || "—"}</span></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(s.grade_levels || []).slice(0, 3).map((g) => (
                            <Badge key={g} className="bg-slate-700 text-slate-300 text-[10px] border-0">{g}</Badge>
                          ))}
                          {(s.grade_levels || []).length > 3 && (
                            <Badge className="bg-slate-700 text-slate-300 text-[10px] border-0">+{(s.grade_levels || []).length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.grading_scales && s.grading_scales.length > 0 ? "success" : "secondary"} className="text-[10px]">
                          {s.grading_scales?.length || 0} scales
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.curriculum_strands && s.curriculum_strands.length > 0 ? "info" : "secondary"} className="text-[10px]">
                          {s.curriculum_strands?.length || 0} strands
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openDetail(s)} className="text-slate-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(s)} className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => { setShowDetail(false); setSelectedSubject(null); }} title={selectedSubject?.name || "Subject Details"} size="lg">
        {loadingDetail ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : selectedSubject && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                <p className="text-xs text-slate-500 uppercase">Code</p>
                <p className="text-lg font-semibold text-slate-200">{selectedSubject.code || "—"}</p>
              </Card>
              <Card className="p-4 bg-slate-900/60 border-slate-700/50 rounded-xl">
                <p className="text-xs text-slate-500 uppercase">Grade Levels</p>
                <p className="text-lg font-semibold text-slate-200">{(selectedSubject.grade_levels || []).length}</p>
              </Card>
            </div>

            {selectedSubject.description && (
              <div>
                <p className="text-xs text-slate-500 uppercase mb-1">Description</p>
                <p className="text-slate-300 text-sm">{selectedSubject.description}</p>
              </div>
            )}

            {selectedSubject.grading_scales && selectedSubject.grading_scales.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase mb-2">Grading Scales</p>
                <Table>
                  <TableHead>
                    <tr><TableHeader>Name</TableHeader><TableHeader>Range</TableHeader><TableHeader>Grade</TableHeader><TableHeader>Description</TableHeader></tr>
                  </TableHead>
                  <TableBody>
                    {selectedSubject.grading_scales.map((scale, i) => (
                      <tr key={i} className="hover:bg-slate-800/50">
                        <TableCell><span className="text-slate-200">{scale.name}</span></TableCell>
                        <TableCell><span className="text-slate-300">{scale.min} - {scale.max}</span></TableCell>
                        <TableCell><Badge variant="info">{scale.grade}</Badge></TableCell>
                        <TableCell><span className="text-slate-400 text-sm">{scale.description || "—"}</span></TableCell>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedSubject.curriculum_strands && selectedSubject.curriculum_strands.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase mb-2">Curriculum Strands</p>
                <div className="space-y-2">
                  {selectedSubject.curriculum_strands.map((strand, i) => (
                    <Card key={i} className="p-3 bg-slate-900/60 border-slate-700/50 rounded-xl">
                      <p className="font-medium text-slate-200">{strand.name}</p>
                      {strand.description && <p className="text-sm text-slate-400 mt-1">{strand.description}</p>}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {linkedClasses.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase mb-2">Linked Classes</p>
                <Table>
                  <TableHead>
                    <tr><TableHeader>Class</TableHeader><TableHeader>Grade</TableHeader><TableHeader>Teacher</TableHeader></tr>
                  </TableHead>
                  <TableBody>
                    {linkedClasses.map((lc) => (
                      <tr key={lc.id} className="hover:bg-slate-800/50">
                        <TableCell><span className="text-slate-200">{lc.name}</span></TableCell>
                        <TableCell><Badge variant="info">{lc.grade_level}</Badge></TableCell>
                        <TableCell><span className="text-slate-300">{lc.teacher_name || "Unassigned"}</span></TableCell>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
