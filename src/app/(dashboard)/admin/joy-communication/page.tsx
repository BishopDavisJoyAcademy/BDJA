"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  MessageSquare, Sparkles, Loader2, Send, Edit3, X, Save, RotateCcw,
  User, GraduationCap, Languages, Volume2, CheckCircle, Copy, Mail
} from "lucide-react";
import { useJoyCommunication } from "@/hooks/useJoyCommunication";
import { useAuth } from "@/hooks/useAuth";
import { apiGet } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";

interface ParentOption {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

interface StudentOption {
  id: string;
  profile_id: string;
  full_name: string;
  class_name: string;
}

type ToneKey = "formal" | "professional" | "casual" | "urgent" | "encouraging";
type LanguageKey = "english" | "kiswahili" | "both";

const TONE_OPTIONS: Array<{ key: ToneKey; label: string; desc: string }> = [
  { key: "formal", label: "Formal", desc: "Professional, structured language" },
  { key: "professional", label: "Professional", desc: "Warm but business-appropriate" },
  { key: "casual", label: "Casual", desc: "Friendly, conversational tone" },
  { key: "urgent", label: "Urgent", desc: "Direct, action-required language" },
  { key: "encouraging", label: "Encouraging", desc: "Positive, supportive, uplifting" },
];

const LANGUAGE_OPTIONS: Array<{ key: LanguageKey; label: string; flag: string }> = [
  { key: "english", label: "English", flag: "🇬🇧" },
  { key: "kiswahili", label: "Kiswahili", flag: "🇰🇪" },
  { key: "both", label: "English + Kiswahili", flag: "🌍" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function JoyCommunicationPage() {
  const { user } = useAuth();
  const { drafting, draftMessage } = useJoyCommunication();

  const [parents, setParents] = useState<ParentOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [fetching, setFetching] = useState(false);

  const [selectedParent, setSelectedParent] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState<ToneKey>("professional");
  const [language, setLanguage] = useState<LanguageKey>("english");
  const [includeGrades, setIncludeGrades] = useState(false);
  const [includeAttendance, setIncludeAttendance] = useState(false);

  const [draftResult, setDraftResult] = useState<{
    body: string;
    tone: string;
    language: string;
    draftId: string;
  } | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);
  const [draftEdit, setDraftEdit] = useState("");

  // Fetch parents and students
  useEffect(() => {
    const load = async () => {
      setFetching(true);
      try {
        const [parentsRes, studentsRes] = await Promise.all([
          apiGet<{ profiles: ParentOption[] }>("/api/users?category=parent&limit=200"),
          apiGet<{ students: StudentOption[] }>("/api/students?limit=500"),
        ]);
        setParents(parentsRes.profiles || []);
        setStudents(studentsRes.students || []);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setFetching(false);
      }
    };
    load();
  }, []);

  const handleDraft = useCallback(async () => {
    if (!subject.trim() || !context.trim()) {
      toast.error("Subject and context are required");
      return;
    }
    if (!selectedParent && !selectedStudent) {
      toast.error("Select a parent or student");
      return;
    }

    const result = await draftMessage({
      recipient_parent_id: selectedParent || undefined,
      recipient_student_id: selectedStudent || undefined,
      subject,
      context,
      tone,
      language,
      include_grade_summary: includeGrades,
      include_attendance_summary: includeAttendance,
    });

    if (result) {
      setDraftResult(result);
      setDraftEdit(result.body);
      setEditingDraft(false);
    }
  }, [draftMessage, selectedParent, selectedStudent, subject, context, tone, language, includeGrades, includeAttendance]);

  const handleCopy = useCallback(() => {
    if (draftResult?.body) {
      navigator.clipboard.writeText(draftResult.body);
      toast.success("Copied to clipboard");
    }
  }, [draftResult]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <MessageSquare className="w-7 h-7 text-[#D4AF37]" />
                Parent Communication
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                AI-drafted messages to parents with tone and language control
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Powered by</span>
              <span className="text-xs font-semibold text-[#D4AF37]">Joy AI</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Compose Form */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-5"
          >
            {/* Recipients */}
            <motion.div variants={itemVariants} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-[#D4AF37]" />
                Recipients
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Parent / Guardian</label>
                  <select
                    value={selectedParent}
                    onChange={(e) => setSelectedParent(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 appearance-none"
                  >
                    <option value="">{fetching ? "Loading..." : "Select parent"}</option>
                    {parents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Student (optional)</label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 appearance-none"
                  >
                    <option value="">{fetching ? "Loading..." : "Select student"}</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} — {s.class_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Message Details */}
            <motion.div variants={itemVariants} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#D4AF37]" />
                Message Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Subject</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Term 1 Progress Update"
                    className="bg-slate-800/60 border-slate-700/50 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Context / Key Points</label>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="What should the message be about? e.g. Student is improving in Math but needs support in English..."
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 placeholder:text-slate-600"
                  />
                </div>
              </div>
            </motion.div>

            {/* Tone & Language */}
            <motion.div variants={itemVariants} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#D4AF37]" />
                Tone & Language
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Tone</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TONE_OPTIONS.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTone(t.key)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border",
                          tone === t.key
                            ? "bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/40"
                            : "bg-slate-800/40 text-slate-400 border-slate-700/40 hover:bg-slate-700/40"
                        )}
                      >
                        <div className="font-semibold">{t.label}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Language</label>
                  <div className="flex gap-2">
                    {LANGUAGE_OPTIONS.map((l) => (
                      <button
                        key={l.key}
                        onClick={() => setLanguage(l.key)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-medium transition-all border flex items-center gap-2",
                          language === l.key
                            ? "bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/40"
                            : "bg-slate-800/40 text-slate-400 border-slate-700/40 hover:bg-slate-700/40"
                        )}
                      >
                        <span>{l.flag}</span>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Include Data */}
            <motion.div variants={itemVariants} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
                Include Student Data
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeGrades}
                    onChange={(e) => setIncludeGrades(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-[#D4AF37] focus:ring-[#D4AF37]/30"
                  />
                  <span className="text-sm text-slate-300">Include grade summary</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAttendance}
                    onChange={(e) => setIncludeAttendance(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-[#D4AF37] focus:ring-[#D4AF37]/30"
                  />
                  <span className="text-sm text-slate-300">Include attendance summary</span>
                </label>
              </div>
            </motion.div>

            {/* Generate Button */}
            <motion.div variants={itemVariants}>
              <Button
                onClick={handleDraft}
                disabled={drafting}
                className="w-full bg-[#D4AF37] hover:bg-[#E8C84A] text-slate-900 font-semibold h-12 text-base"
              >
                {drafting ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                {drafting ? "Drafting with Joy..." : "Draft Message"}
              </Button>
            </motion.div>
          </motion.div>

          {/* Right: Draft Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 h-fit sticky top-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Languages className="w-4 h-4 text-[#D4AF37]" />
                AI Draft Preview
              </h2>
              {draftResult && (
                <div className="flex gap-1">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-[#D4AF37] transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingDraft(!editingDraft)}
                    className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-[#D4AF37] transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {!draftResult ? (
              <div className="text-center py-16">
                <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Fill in the details and click Draft Message to see the AI-generated preview here.</p>
              </div>
            ) : editingDraft ? (
              <div className="space-y-3">
                <textarea
                  value={draftEdit}
                  onChange={(e) => setDraftEdit(e.target.value)}
                  rows={16}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setEditingDraft(false)} className="text-slate-400 text-xs">
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setDraftResult({ ...draftResult, body: draftEdit }); setEditingDraft(false); toast.success("Draft updated"); }}
                    className="border-slate-600 text-slate-300 text-xs"
                  >
                    <Save className="w-3 h-3 mr-1" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {draftResult.body}
                  </pre>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/30">
                    {draftResult.tone}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/30">
                    {draftResult.language}
                  </span>
                  <span className="flex items-center gap-1 text-[#D4AF37]">
                    <CheckCircle className="w-3 h-3" />
                    AI Drafted
                  </span>
                </div>
                <Button
                  onClick={() => toast.success("Message sent to parent (demo)")}
                  className="w-full bg-[#D4AF37] hover:bg-[#E8C84A] text-slate-900 font-semibold"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
