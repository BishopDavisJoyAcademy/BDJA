"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, Calendar, Clock, Users, CheckCircle2,
  XCircle, Loader2, AlertCircle, FileText, BarChart3,
  ChevronRight, Award, MessageSquare, Save, Download
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const GOLD = "#D4AF37";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  max_score: number;
  class_name: string | null;
  grade_level: string | null;
  subject_name: string | null;
}

interface Submission {
  student_id: string;
  admission_number: string;
  full_name: string;
  avatar_url: string | null;
  status: string;
  submitted_at: string | null;
  content: string | null;
  attachments: string[] | null;
  grade: { score: number; feedback: string; max_score: number } | null;
  submission_id: string | null;
}

export default function TeacherAssignmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gradingStudent, setGradingStudent] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

        const [assignRes, subRes] = await Promise.all([
          fetch(`/api/assignments/${assignmentId}`, { headers }),
          fetch(`/api/assignments/${assignmentId}/submissions`, { headers }),
        ]);

        if (!assignRes.ok) {
          const err = await assignRes.json().catch(() => ({}));
          throw new Error(err.error || "Failed to load assignment");
        }
        if (!subRes.ok) {
          const err = await subRes.json().catch(() => ({}));
          throw new Error(err.error || "Failed to load submissions");
        }

        const assignData = await assignRes.json();
        const subData = await subRes.json();
        setAssignment(assignData.assignment);
        setSubmissions(subData.submissions || []);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Could not load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [assignmentId]);

  const handleGrade = async (studentId: string) => {
    if (!score || isNaN(Number(score))) {
      toast.error("Please enter a valid score");
      return;
    }
    setSavingGrade(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch(`/api/assignments/${assignmentId}/submissions/grade`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          student_id: studentId,
          score: Number(score),
          feedback,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save grade");

      toast.success("Grade saved");
      setGradingStudent(null);
      setScore("");
      setFeedback("");

      // Refresh submissions
      const subRes = await fetch(`/api/assignments/${assignmentId}/submissions`, { headers });
      const subData = await subRes.json();
      setSubmissions(subData.submissions || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to save grade");
    } finally {
      setSavingGrade(false);
    }
  };

  const stats = {
    total: submissions.length,
    submitted: submissions.filter((s) => s.status !== "not_submitted").length,
    graded: submissions.filter((s) => s.status === "graded").length,
    notSubmitted: submissions.filter((s) => s.status === "not_submitted").length,
  };

  const isOverdue = (due: string) => new Date(due) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white">Assignment not found</h3>
        <button onClick={() => router.push("/teacher/assignments")}
          className="mt-4 text-sm text-amber-400 hover:text-amber-300">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/teacher/assignments")}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{assignment.title}</h1>
            <p className="text-sm text-slate-400">{assignment.class_name} · {assignment.subject_name}</p>
          </div>
        </div>

        {/* Assignment info card */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{assignment.description}</p>
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleString("en-GB") : "No due date"}
              {assignment.due_date && isOverdue(assignment.due_date) && (
                <span className="text-red-400 ml-1">(Overdue)</span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              Max Score: {assignment.max_score}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {stats.total} students
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: GOLD },
            { label: "Submitted", value: stats.submitted, color: "#22c55e" },
            { label: "Graded", value: stats.graded, color: "#3b82f6" },
            { label: "Missing", value: stats.notSubmitted, color: "#ef4444" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="p-3 rounded-xl flex items-start gap-2.5"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </motion.div>
      )}

      {/* Submissions list */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Student Submissions</h3>
        {submissions.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 border border-slate-700/50 rounded-2xl">
            <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">No students in this class</p>
          </div>
        ) : (
          submissions.map((sub, i) => (
            <motion.div key={sub.student_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
              {/* Student header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}>
                    {sub.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{sub.full_name}</p>
                    <p className="text-[11px] text-slate-500">{sub.admission_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {sub.status === "graded" && sub.grade && (
                    <span className="px-2.5 py-1 rounded-lg text-sm font-bold" style={{ background: `${GOLD}15`, color: GOLD }}>
                      {sub.grade.score}/{sub.grade.max_score}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase border ${
                    sub.status === "graded"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : sub.status === "submitted" || sub.status === "submitted_late"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-slate-700/50 text-slate-400 border-slate-600/30"
                  }`}>
                    {sub.status.replace("_", " ")}
                  </span>
                  <button onClick={() => {
                    setGradingStudent(gradingStudent === sub.student_id ? null : sub.student_id);
                    if (sub.grade) { setScore(String(sub.grade.score)); setFeedback(sub.grade.feedback || ""); }
                    else { setScore(""); setFeedback(""); }
                  }} className="text-xs text-amber-400 hover:text-amber-300 font-medium">
                    {gradingStudent === sub.student_id ? "Close" : sub.status === "graded" ? "Edit Grade" : "Grade"}
                  </button>
                </div>
              </div>

              {/* Submission content */}
              <AnimatePresence>
                {(sub.content || sub.attachments) && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                    className="border-t border-slate-700/30 px-4 py-3">
                    {sub.content && (
                      <div className="mb-2">
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Answer</p>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{sub.content}</p>
                      </div>
                    )}
                    {sub.attachments && sub.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {sub.attachments.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400 hover:text-white transition-colors">
                            <Download className="w-3.5 h-3.5" />
                            Attachment {idx + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Grading form */}
              <AnimatePresence>
                {gradingStudent === sub.student_id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-700/30 px-4 py-4 bg-slate-800/20">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-500 uppercase tracking-wider">Score (/{assignment.max_score})</label>
                        <input type="number" value={score} onChange={(e) => setScore(e.target.value)}
                          min={0} max={assignment.max_score}
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/50" />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] text-slate-500 uppercase tracking-wider">Feedback</label>
                        <input type="text" value={feedback} onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Great work! Consider..."
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/50" />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => handleGrade(sub.student_id)} disabled={savingGrade}
                        className="px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                        style={{ background: GOLD, color: "#0a1628" }}>
                        {savingGrade ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Grade
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
