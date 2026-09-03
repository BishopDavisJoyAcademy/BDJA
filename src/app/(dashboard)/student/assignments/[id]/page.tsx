"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  ArrowLeft, BookOpen, Calendar, Clock, BarChart3, Upload,
  Loader2, AlertCircle, CheckCircle2, Send, FileText,
  Download, X, Award, MessageSquare, AlertTriangle
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
  attachments: string[] | null;
  rubric: string | null;
  class_name: string | null;
  subject_name: string | null;
}

interface MySubmission {
  id: string;
  content: string | null;
  attachments: string[] | null;
  status: string;
  submitted_at: string;
  grade: { score: number; feedback: string; max_score: number } | null;
  graded_at: string | null;
}

export default function StudentAssignmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [mySubmission, setMySubmission] = useState<MySubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [answer, setAnswer] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch(`/api/assignments/${assignmentId}`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load assignment");
      }
      const data = await res.json();
      setAssignment(data.assignment);
      if (data.mySubmission) {
        setMySubmission(data.mySubmission);
        setAnswer(data.mySubmission.content || "");
        setUploadedFiles(data.mySubmission.attachments || []);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load assignment");
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }
      try {
        const ext = file.name.split(".").pop();
        const fileName = `assignments/${assignmentId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("assignments").upload(fileName, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("assignments").getPublicUrl(fileName);
        newUrls.push(publicUrl);
      } catch (err: unknown) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploadedFiles((prev) => [...prev, ...newUrls]);
    setUploading(false);
  };

  const removeFile = (url: string) => {
    setUploadedFiles((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = async () => {
    if (!answer.trim() && uploadedFiles.length === 0) {
      toast.error("Please write an answer or upload a file");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch(`/api/assignments/${assignmentId}/submissions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: answer.trim() || null,
          attachments: uploadedFiles.length > 0 ? uploadedFiles : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");

      toast.success(data.late ? "Submitted (late)" : "Submitted successfully");
      await fetchData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = (due: string) => new Date(due) < new Date();
  const canSubmit = assignment && assignment.status !== "closed" && (!mySubmission || mySubmission.status === "not_submitted" || mySubmission.status === "pending");

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
        <button onClick={() => router.push("/student/assignments")} className="mt-4 text-sm text-amber-400 hover:text-amber-300">
          Back to assignments
        </button>
      </div>
    );
  }

  const overdue = isOverdue(assignment.due_date);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push("/student/assignments")}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{assignment.title}</h1>
            <p className="text-sm text-slate-400">{assignment.subject_name} · {assignment.class_name}</p>
          </div>
        </div>

        {/* Assignment card */}
        <div className={`bg-slate-900/60 border rounded-xl p-5 ${overdue ? "border-red-500/20" : "border-slate-700/50"}`}>
          <div className="flex items-center gap-2 mb-3">
            {overdue && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                Overdue
              </span>
            )}
            {mySubmission?.status === "graded" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Graded
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{assignment.description}</p>
          {assignment.rubric && (
            <div className="mt-4 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Rubric</p>
              <p className="text-xs text-slate-400">{assignment.rubric}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Due: {new Date(assignment.due_date).toLocaleString("en-GB")}
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              {assignment.max_score} points
            </span>
          </div>
          {assignment.attachments && assignment.attachments.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {assignment.attachments.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400 hover:text-white transition-colors">
                  <Download className="w-3.5 h-3.5" />
                  Resource {idx + 1}
                </a>
              ))}
            </div>
          )}
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

      {/* My Submission / Grade */}
      {mySubmission && mySubmission.status !== "not_submitted" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Your Submission
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase border ${
              mySubmission.status === "graded"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : mySubmission.status === "submitted_late"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-green-500/10 text-green-400 border-green-500/20"
            }`}>
              {mySubmission.status.replace("_", " ")}
            </span>
          </div>

          {mySubmission.content && (
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Your Answer</p>
              <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{mySubmission.content}</p>
              </div>
            </div>
          )}

          {mySubmission.attachments && mySubmission.attachments.length > 0 && (
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Your Files</p>
              <div className="flex flex-wrap gap-2">
                {mySubmission.attachments.map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400 hover:text-white transition-colors">
                    <Download className="w-3.5 h-3.5" />
                    File {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-600">
            Submitted {new Date(mySubmission.submitted_at).toLocaleString("en-GB")}
          </p>

          {/* Grade display */}
          {mySubmission.grade && (
            <div className="mt-4 p-4 rounded-xl border border-amber-400/20" style={{ background: `${GOLD}08` }}>
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5" style={{ color: GOLD }} />
                <h4 className="font-semibold text-white text-sm">Your Grade</h4>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold" style={{ color: GOLD }}>{mySubmission.grade.score}</span>
                <span className="text-sm text-slate-500">/ {mySubmission.grade.max_score}</span>
              </div>
              {mySubmission.grade.feedback && (
                <div className="mt-2">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Teacher Feedback</p>
                  <p className="text-sm text-slate-300">{mySubmission.grade.feedback}</p>
                </div>
              )}
              {mySubmission.graded_at && (
                <p className="text-[11px] text-slate-600 mt-2">
                  Graded on {new Date(mySubmission.graded_at).toLocaleDateString("en-GB")}
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Submit form */}
      {canSubmit && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Send className="w-4 h-4" style={{ color: GOLD }} />
            Submit Your Work
          </h3>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Your Answer</label>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6}
              className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 resize-none"
              placeholder="Type your answer here..." />
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Attachments</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700/50 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload Files"}
                </div>
              </label>
              <span className="text-[11px] text-slate-600">Max 10MB per file</span>
            </div>

            <AnimatePresence>
              {uploadedFiles.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2">
                  {uploadedFiles.map((url, idx) => (
                    <motion.div key={url} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-300">
                      <FileText className="w-3.5 h-3.5" />
                      File {idx + 1}
                      <button onClick={() => removeFile(url)} className="ml-1 text-slate-500 hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: GOLD, color: "#0a1628" }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {overdue ? "Submit (Late)" : "Submit Assignment"}
          </motion.button>
        </motion.div>
      )}

      {!canSubmit && !mySubmission && (
        <div className="text-center py-8 bg-slate-900/50 border border-slate-700/50 rounded-xl">
          <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">This assignment is closed and no longer accepting submissions.</p>
        </div>
      )}
    </div>
  );
}
