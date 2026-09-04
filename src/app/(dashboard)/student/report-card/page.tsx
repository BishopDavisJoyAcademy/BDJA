"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  Printer, Download, Loader2, AlertCircle, CheckCircle2, Award,
  Calendar, GraduationCap, User, School, MapPin, Phone, Mail,
  TrendingUp, Clock, BookOpen, FileText, Star, Shield,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const GOLD = "#D4AF37";

interface AssessmentItem {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  strand: string;
  sub_strand: string;
  specific_learning_outcome: string | null;
  score: number | null;
  max_score: number | null;
  performance_level: string;
}

interface SubjectSummary {
  subject_id: string;
  subject_name: string;
  average: number;
  total_score: number;
  total_max: number;
  strand_count: number;
  assessments: AssessmentItem[];
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  admission_number: string;
  class_name: string;
  grade_level: string;
}

interface SchoolInfo {
  school_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  logo_url: string | null;
  currency: string;
}

interface ReportCardData {
  student: StudentInfo;
  teacher: { name: string };
  term: string;
  academic_year: string;
  assessments: SubjectSummary[];
  attendance: AttendanceStats;
  fees: { total_paid: number };
  school: SchoolInfo;
  report_card: {
    teacher_remarks: string | null;
    principal_remarks: string | null;
    status: string | null;
    generated_at: string | null;
    parent_acknowledged: boolean | null;
    parent_acknowledged_at: string | null;
  } | null;
}

const performanceConfig: Record<string, { label: string; color: string; grade: string }> = {
  excellent: { label: "Excellent", color: "#22c55e", grade: "A" },
  good: { label: "Good", color: "#3b82f6", grade: "B" },
  average: { label: "Average", color: "#f59e0b", grade: "C" },
  below_average: { label: "Below Average", color: "#f97316", grade: "D" },
  poor: { label: "Poor", color: "#ef4444", grade: "E" },
};

const TERMS = ["Term 1", "Term 2", "Term 3"];
const YEARS = ["2024/2025", "2025/2026", "2026/2027"];

export default function StudentReportCardPage() {
  const [data, setData] = useState<ReportCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [selectedYear, setSelectedYear] = useState("2025/2026");
  const printRef = useRef<HTMLDivElement>(null);

  const fetchReportCard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch(`/api/student/report-card?term=${encodeURIComponent(selectedTerm)}&academic_year=${encodeURIComponent(selectedYear)}`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch report card");
      }
      const result = await res.json();
      setData(result);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load report card");
      toast.error(getErrorMessage(err) || "Could not load report card");
    } finally {
      setLoading(false);
    }
  }, [selectedTerm, selectedYear]);

  useEffect(() => {
    fetchReportCard();
  }, [fetchReportCard]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const styles = `
      @page { size: A4; margin: 15mm; }
      body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; background: white; }
      .report-card { max-width: 210mm; margin: 0 auto; padding: 20px; }
      .header { text-align: center; border-bottom: 3px solid #D4AF37; padding-bottom: 16px; margin-bottom: 20px; }
      .school-name { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
      .school-info { font-size: 11px; color: #64748b; }
      .section-title { font-size: 13px; font-weight: 600; color: #D4AF37; text-transform: uppercase; letter-spacing: 0.05em; margin: 16px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 8px 0; }
      th { background: #f8fafc; color: #475569; font-weight: 600; text-align: left; padding: 8px; border: 1px solid #e2e8f0; }
      td { padding: 8px; border: 1px solid #e2e8f0; color: #334155; }
      .performance-excellent { color: #22c55e; font-weight: 600; }
      .performance-good { color: #3b82f6; font-weight: 600; }
      .performance-average { color: #f59e0b; font-weight: 600; }
      .performance-below { color: #f97316; font-weight: 600; }
      .performance-poor { color: #ef4444; font-weight: 600; }
      .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 12px 0; }
      .stat-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
      .stat-label { font-size: 9px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
      .stat-value { font-size: 18px; font-weight: 700; color: #1e293b; }
      .signature-row { display: flex; justify-content: space-between; margin-top: 32px; gap: 24px; }
      .signature-box { flex: 1; text-align: center; }
      .signature-line { border-top: 1px solid #94a3b8; margin-top: 40px; padding-top: 4px; font-size: 11px; color: #64748b; }
      .remarks-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 8px 0; min-height: 60px; font-size: 11px; color: #475569; }
      @media print { .no-print { display: none !important; } }
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Report Card - ${data?.student.name || ""}</title><style>${styles}</style></head>
      <body>${printRef.current.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const overallAverage = data?.assessments.length
    ? Math.round(data.assessments.reduce((s, a) => s + a.average, 0) / data.assessments.length)
    : 0;

  const overallLevel = overallAverage >= 80 ? "excellent"
    : overallAverage >= 65 ? "good"
    : overallAverage >= 50 ? "average"
    : overallAverage >= 35 ? "below_average"
    : "poor";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-8 h-8" style={{ color: GOLD }} />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={fetchReportCard} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: `${GOLD}15`, color: GOLD }}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-semibold text-white">Report Card</h1>
          <p className="text-sm text-slate-400 mt-1">View and print your academic report</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2"
            
          >
            {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white focus:outline-none focus:ring-2"
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-950 transition-all hover:opacity-90"
            style={{ background: GOLD }}
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </motion.div>

      {/* Report Card */}
      <div ref={printRef} className="bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-8 md:p-12 max-w-[210mm] mx-auto">
          {/* School Header */}
          <div className="text-center border-b-2 pb-6 mb-6" style={{ borderColor: GOLD }}>
            {data?.school.logo_url && (
              <Image src={data.school.logo_url} alt="School Logo" width={64} height={64} className="mx-auto mb-3 object-contain" />
            )}
            <h2 className="text-2xl font-bold text-slate-900">{data?.school.school_name || "Bishop Davis Joy Academy"}</h2>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-500">
              {data?.school.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{data.school.address}</span>}
              {data?.school.contact_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{data.school.contact_phone}</span>}
              {data?.school.contact_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{data.school.contact_email}</span>}
            </div>
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}40` }}>
              <FileText className="w-3.5 h-3.5" />
              Competency-Based Assessment Report
            </div>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <User className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Learner</p>
                <p className="text-sm font-semibold text-slate-800">{data?.student.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <School className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Class</p>
                <p className="text-sm font-semibold text-slate-800">{data?.student.class_name} ({data?.student.grade_level})</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Period</p>
                <p className="text-sm font-semibold text-slate-800">{data?.term} · {data?.academic_year}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <GraduationCap className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Admission No.</p>
                <p className="text-sm font-semibold text-slate-800">{data?.student.admission_number || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Overall Performance */}
          <div className="flex items-center gap-4 p-4 rounded-xl mb-6" style={{ background: `${performanceConfig[overallLevel]?.color || GOLD}08`, border: `1px solid ${performanceConfig[overallLevel]?.color || GOLD}25` }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: `${performanceConfig[overallLevel]?.color || GOLD}15`, color: performanceConfig[overallLevel]?.color || GOLD }}>
              {overallAverage}%
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Overall Performance: {performanceConfig[overallLevel]?.label || "N/A"}</p>
              <p className="text-xs text-slate-500">Based on {data?.assessments.reduce((s, a) => s + a.strand_count, 0) || 0} assessments across {data?.assessments.length || 0} learning areas</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Grade</p>
              <p className="text-2xl font-bold" style={{ color: performanceConfig[overallLevel]?.color || GOLD }}>
                {performanceConfig[overallLevel]?.grade || "-"}
              </p>
            </div>
          </div>

          {/* Learning Areas Table */}
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" style={{ color: GOLD }} />
            Learning Areas Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-2.5 border border-slate-200 font-semibold text-slate-600">Learning Area</th>
                  <th className="text-left p-2.5 border border-slate-200 font-semibold text-slate-600">Strand</th>
                  <th className="text-left p-2.5 border border-slate-200 font-semibold text-slate-600">Sub-Strand</th>
                  <th className="text-left p-2.5 border border-slate-200 font-semibold text-slate-600">Outcome</th>
                  <th className="text-center p-2.5 border border-slate-200 font-semibold text-slate-600">Score</th>
                  <th className="text-center p-2.5 border border-slate-200 font-semibold text-slate-600">Level</th>
                </tr>
              </thead>
              <tbody>
                {data?.assessments.map((subject) =>
                  subject.assessments.map((item, idx) => {
                    const cfg = performanceConfig[item.performance_level] || performanceConfig.average;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        {idx === 0 && (
                          <td className="p-2.5 border border-slate-200 font-medium text-slate-800" rowSpan={subject.assessments.length}>
                            {subject.subject_name}
                            <div className="text-[10px] text-slate-400 mt-0.5">Avg: {subject.average}%</div>
                          </td>
                        )}
                        <td className="p-2.5 border border-slate-200 text-slate-600">{item.strand}</td>
                        <td className="p-2.5 border border-slate-200 text-slate-600">{item.sub_strand}</td>
                        <td className="p-2.5 border border-slate-200 text-slate-500">{item.specific_learning_outcome || "—"}</td>
                        <td className="p-2.5 border border-slate-200 text-center font-semibold text-slate-700">
                          {item.score ?? "—"}{item.max_score ? ` / ${item.max_score}` : ""}
                        </td>
                        <td className="p-2.5 border border-slate-200 text-center">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" style={{ background: `${cfg.color}15`, color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
                {(!data?.assessments || data.assessments.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400 border border-slate-200">
                      No assessment records for this term
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Attendance & Fees Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Attendance */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: GOLD }} />
                Attendance Summary
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Total", value: data?.attendance.total || 0, color: "#64748b" },
                  { label: "Present", value: data?.attendance.present || 0, color: "#22c55e" },
                  { label: "Absent", value: data?.attendance.absent || 0, color: "#ef4444" },
                  { label: "Rate", value: `${data?.attendance.rate || 0}%`, color: GOLD },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Fees */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: GOLD }} />
                Fee Status
              </h3>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Total Paid</p>
                    <p className="text-xl font-bold text-slate-800">
                      {data?.school.currency || "KES"} {data?.fees.total_paid.toLocaleString() || "0"}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4" style={{ color: GOLD }} />
              Remarks & Feedback
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Class Teacher Remarks</p>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 min-h-[80px] text-xs text-slate-600">
                  {data?.report_card?.teacher_remarks || "No remarks recorded."}
                </div>
                {data?.teacher.name && (
                  <p className="text-[10px] text-slate-400 mt-1">— {data.teacher.name}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Principal / Head Teacher Remarks</p>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 min-h-[80px] text-xs text-slate-600">
                  {data?.report_card?.principal_remarks || "No remarks recorded."}
                </div>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="h-12 border-b border-slate-300 mb-2" />
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Class Teacher</p>
                <p className="text-xs font-medium text-slate-600">{data?.teacher.name || "_________________"}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Date: {data?.report_card?.generated_at ? new Date(data.report_card.generated_at).toLocaleDateString() : "___________"}</p>
              </div>
              <div className="text-center">
                <div className="h-12 border-b border-slate-300 mb-2" />
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Principal</p>
                <p className="text-xs font-medium text-slate-600">_________________</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Date: ___________</p>
              </div>
              <div className="text-center">
                <div className="h-12 border-b border-slate-300 mb-2" />
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Parent / Guardian</p>
                <p className="text-xs font-medium text-slate-600">
                  {data?.report_card?.parent_acknowledged ? "Acknowledged" : "_________________"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Date: {data?.report_card?.parent_acknowledged_at ? new Date(data.report_card.parent_acknowledged_at).toLocaleDateString() : "___________"}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-slate-200 text-center">
            <p className="text-[10px] text-slate-400">
              This is an official document of {data?.school.school_name || "Bishop Davis Joy Academy"}. Any alteration renders it invalid.
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Generated on {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
