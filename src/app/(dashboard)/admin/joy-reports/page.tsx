"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import {
  FileText, Sparkles, Loader2, Search, Filter, ChevronDown, ChevronUp,
  Edit3, CheckCircle, Send, Eye, X, Save, RotateCcw, GraduationCap,
  Calendar, BookOpen, TrendingUp, AlertTriangle, Award, Clock
} from "lucide-react";
import { useJoyReports } from "@/hooks/useJoyReports";
import { useAuth } from "@/hooks/useAuth";
import { apiGet } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";

interface StudentOption {
  id: string;
  full_name: string;
  class_name: string;
  grade_level: string;
}

interface ClassOption {
  id: string;
  name: string;
  grade_level: string;
  stream: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const TERM_OPTIONS = ["Term 1", "Term 2", "Term 3"];

export default function JoyReportsPage() {
  const { user } = useAuth();
  const { reports, loading, generating, fetchReports, generateReport, updateReport } = useJoyReports();

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>("2026");
  const [term, setTerm] = useState<string>("Term 1");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [viewingReport, setViewingReport] = useState<typeof reports[0] | null>(null);
  const [editingNarrative, setEditingNarrative] = useState(false);
  const [narrativeEdit, setNarrativeEdit] = useState("");
  const [teacherRemarks, setTeacherRemarks] = useState("");
  const [fetchingStudents, setFetchingStudents] = useState(false);

  // Fetch students and classes on mount
  useEffect(() => {
    const load = async () => {
      setFetchingStudents(true);
      try {
        const [studentsRes, classesRes] = await Promise.all([
          apiGet<{ students: StudentOption[] }>("/api/students?limit=500"),
          apiGet<{ classes: ClassOption[] }>("/api/classes?limit=100"),
        ]);
        setStudents(studentsRes.students || []);
        setClasses(classesRes.classes || []);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setFetchingStudents(false);
      }
    };
    load();
  }, []);

  // Fetch reports when filters change
  useEffect(() => {
    fetchReports({
      academic_year: academicYear,
      term,
      class_id: selectedClass || undefined,
      status: statusFilter || undefined,
    });
  }, [academicYear, term, selectedClass, statusFilter, fetchReports]);

  const handleGenerate = useCallback(async () => {
    if (!selectedStudent) {
      toast.error("Select a student first");
      return;
    }
    const result = await generateReport(selectedStudent, academicYear, term);
    if (result) {
      fetchReports({ academic_year: academicYear, term, class_id: selectedClass || undefined });
    }
  }, [selectedStudent, academicYear, term, selectedClass, generateReport, fetchReports]);

  const handlePublish = useCallback(async (id: string) => {
    const updated = await updateReport(id, { status: "published" });
    if (updated) {
      setViewingReport(null);
      fetchReports({ academic_year: academicYear, term, class_id: selectedClass || undefined });
    }
  }, [updateReport, fetchReports, academicYear, term, selectedClass]);

  const handleSaveEdit = useCallback(async (id: string) => {
    const updated = await updateReport(id, {
      ai_narrative: narrativeEdit,
      teacher_remarks: teacherRemarks,
    });
    if (updated) {
      setEditingNarrative(false);
      setViewingReport(updated);
      fetchReports({ academic_year: academicYear, term, class_id: selectedClass || undefined });
    }
  }, [updateReport, narrativeEdit, teacherRemarks, fetchReports, academicYear, term, selectedClass]);

  const filteredReports = reports.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      r.profiles?.full_name?.toLowerCase().includes(q) ||
      r.classes?.name?.toLowerCase().includes(q) ||
      r.academic_year.toLowerCase().includes(q)
    );
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      archived: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };
    return map[status] || map.draft;
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <FileText className="w-7 h-7 text-[#D4AF37]" />
                AI Report Cards
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                Generate, review, and publish AI-powered narrative report cards
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Powered by</span>
              <span className="text-xs font-semibold text-[#D4AF37]">Joy AI</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Generate Panel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            Generate New Report
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Student Select */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Student</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 appearance-none"
                >
                  <option value="">{fetchingStudents ? "Loading..." : "Select student"}</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} — {s.class_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 appearance-none"
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.stream}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Academic Year</label>
              <Input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2026"
                className="bg-slate-800/60 border-slate-700/50 text-white"
              />
            </div>

            {/* Term */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 appearance-none"
              >
                {TERM_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button
                onClick={handleGenerate}
                disabled={generating || !selectedStudent}
                className="w-full bg-[#D4AF37] hover:bg-[#E8C84A] text-slate-900 font-semibold h-[42px]"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {generating ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search reports by student or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900/60 border-slate-700/50 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="flex gap-2">
            {["", "draft", "published", "archived"].map((s) => (
              <button
                key={s || "all"}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  statusFilter === s
                    ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                    : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700/60"
                )}
              >
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : filteredReports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-700/30"
          >
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No reports yet</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Select a student and click Generate Report to create an AI-powered narrative report card.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-4"
          >
            {filteredReports.map((report) => (
              <motion.div
                key={report.id}
                variants={itemVariants}
                className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 hover:border-[#D4AF37]/20 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border", statusBadge(report.status))}>
                        {report.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        {report.academic_year} · {report.term}
                      </span>
                      {report.ai_generated_at && (
                        <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-md border border-[#D4AF37]/20">
                          AI Generated
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-semibold text-base">
                      {report.profiles?.full_name || "Unknown Student"}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {report.classes?.name || "Unknown Class"} {report.classes?.stream}
                    </p>
                    {report.ai_narrative && (
                      <p className="text-slate-500 text-xs mt-2 line-clamp-2">
                        {report.ai_narrative.substring(0, 180)}...
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(report.generated_at).toLocaleDateString()}
                      </span>
                      {report.published_at && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          Published {new Date(report.published_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setViewingReport(report);
                        setNarrativeEdit(report.ai_narrative || "");
                        setTeacherRemarks(report.teacher_remarks || "");
                        setEditingNarrative(false);
                      }}
                      className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-[#D4AF37] transition-colors"
                      title="View & Edit"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {report.status === "draft" && (
                      <button
                        onClick={() => handlePublish(report.id)}
                        className="p-2 rounded-lg hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 transition-colors"
                        title="Publish"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* View/Edit Modal */}
      <Modal
        isOpen={!!viewingReport}
        onClose={() => setViewingReport(null)}
        title={viewingReport ? `${viewingReport.profiles?.full_name} — ${viewingReport.term}` : ""}
        className="max-w-3xl"
      >
        {viewingReport && (
          <div className="space-y-5 p-2 max-h-[70vh] overflow-y-auto">
            {/* Status bar */}
            <div className="flex items-center gap-3">
              <span className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold border", statusBadge(viewingReport.status))}>
                {viewingReport.status.toUpperCase()}
              </span>
              <span className="text-xs text-slate-500">
                Generated {new Date(viewingReport.generated_at).toLocaleDateString()}
                {viewingReport.ai_model_used && ` · ${viewingReport.ai_model_used}`}
              </span>
            </div>

            {/* AI Narrative */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  AI Narrative
                </h4>
                <button
                  onClick={() => setEditingNarrative(!editingNarrative)}
                  className="text-xs text-[#D4AF37] hover:text-[#E8C84A] flex items-center gap-1"
                >
                  {editingNarrative ? (
                    <><X className="w-3 h-3" /> Cancel</>
                  ) : (
                    <><Edit3 className="w-3 h-3" /> Edit</>
                  )}
                </button>
              </div>
              {editingNarrative ? (
                <textarea
                  value={narrativeEdit}
                  onChange={(e) => setNarrativeEdit(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                />
              ) : (
                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {viewingReport.ai_narrative || "No narrative generated yet."}
                  </pre>
                </div>
              )}
            </div>

            {/* Teacher Remarks */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-slate-400" />
                Teacher Remarks
              </h4>
              <textarea
                value={teacherRemarks}
                onChange={(e) => setTeacherRemarks(e.target.value)}
                placeholder="Add your personal remarks here..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 placeholder:text-slate-600"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-700/30">
              {editingNarrative && (
                <Button
                  variant="ghost"
                  onClick={() => setEditingNarrative(false)}
                  className="text-slate-400"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => handleSaveEdit(viewingReport.id)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700/60"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              {viewingReport.status === "draft" && (
                <Button
                  onClick={() => handlePublish(viewingReport.id)}
                  className="bg-[#D4AF37] hover:bg-[#E8C84A] text-slate-900 font-semibold"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Publish Report
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
