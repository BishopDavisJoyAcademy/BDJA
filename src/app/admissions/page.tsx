"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import SchoolDocumentHeader from "@/components/SchoolDocumentHeader";
import {
  GraduationCap, User, Users, Phone, Mail, MapPin, Calendar, HeartPulse,
  FileText, CheckCircle, Printer, ArrowRight, ArrowLeft, Loader2,
  AlertCircle, School, BookOpen, Shield, Clock, Send, X
} from "lucide-react";

const GOLD = "#D4AF37";

interface Campus {
  id: string;
  name: string;
  location: string;
  email?: string;
  phone?: string;
}

interface GradeLevel {
  label: string;
  value: string;
}

interface AdmissionFormData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  grade_applied: string;
  campus_id: string;
  previous_school: string;
  previous_grade: string;
  home_address: string;
  city: string;
  county: string;
  country: string;
  nationality: string;
  religion: string;
  birth_certificate_no: string;
  passport_no: string;
  sibling_names: string;
  medical_conditions: string;
  allergies: string;
  special_needs: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  parent_occupation: string;
  parent_address: string;
  parent_id_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  notes: string;
}

const emptyForm: AdmissionFormData = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "",
  grade_applied: "",
  campus_id: "",
  previous_school: "",
  previous_grade: "",
  home_address: "",
  city: "",
  county: "",
  country: "Kenya",
  nationality: "Kenyan",
  religion: "",
  birth_certificate_no: "",
  passport_no: "",
  sibling_names: "",
  medical_conditions: "",
  allergies: "",
  special_needs: "",
  parent_name: "",
  parent_email: "",
  parent_phone: "",
  parent_occupation: "",
  parent_address: "",
  parent_id_number: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relationship: "",
  notes: "",
};

const STEPS = [
  { id: 1, label: "Student Info", icon: User },
  { id: 2, label: "Academic Background", icon: BookOpen },
  { id: 3, label: "Health & Medical", icon: HeartPulse },
  { id: 4, label: "Parent/Guardian", icon: Users },
  { id: 5, label: "Emergency Contact", icon: Shield },
  { id: 6, label: "Review & Submit", icon: FileText },
];

export default function AdmissionsPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AdmissionFormData>(emptyForm);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [loadingCampuses, setLoadingCampuses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [admissionRef, setAdmissionRef] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch campuses and grade levels
    Promise.all([
      fetch("/api/public/campuses").then((r) => r.json().catch(() => ({}))),
      fetch("/api/admin/timetable-config").then((r) => r.json().catch(() => ({}))),
    ])
      .then(([campusData, configData]) => {
        /* campuses loaded */
        setCampuses(campusData.campuses || []);
        const grades = (configData.config?.grade_levels || [
          "Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3",
          "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9",
          "Grade 10", "Grade 11", "Grade 12"
        ]).map((g: string) => ({ label: g, value: g }));
        setGradeLevels(grades);
        setLoadingCampuses(false);
      })
      .catch(() => setLoadingCampuses(false));
  }, []);

  const updateField = (field: keyof AdmissionFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validateStep = (s: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (s === 1) {
      if (!form.first_name.trim()) newErrors.first_name = "First name is required";
      if (!form.last_name.trim()) newErrors.last_name = "Last name is required";
      if (!form.date_of_birth) newErrors.date_of_birth = "Date of birth is required";
      if (!form.gender) newErrors.gender = "Gender is required";
    }
    if (s === 2) {
      if (!form.grade_applied) newErrors.grade_applied = "Grade applied is required";
      if (!form.campus_id) newErrors.campus_id = "Campus is required";
    }
    if (s === 4) {
      if (!form.parent_name.trim()) newErrors.parent_name = "Parent/guardian name is required";
      if (!form.parent_phone.trim()) newErrors.parent_phone = "Parent phone is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, STEPS.length));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application");
      }
      setAdmissionRef(data.admission?.id || null);
      setSubmitted(true);
      toast.success(data.message || "Application submitted successfully!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ========== PRINT STYLES ==========
  const printStyles = `
    @media print {
      @page { margin: 15mm; }
      html, body {
        background: white !important;
        color: black !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print, .no-print * {
        display: none !important;
        visibility: hidden !important;
      }
      .print-only {
        display: block !important;
        visibility: visible !important;
      }
      .fixed, [class*="fixed"] {
        position: static !important;
      }
      .admissions-container {
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .admission-card {
        border: none !important;
        box-shadow: none !important;
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .print-header {
        border-bottom: 2px solid #D4AF37 !important;
        padding-bottom: 12px !important;
        margin-bottom: 16px !important;
      }
      h1, h2, h3, p, div, span, strong {
        color: black !important;
      }
      .text-slate-400, .text-slate-500, .text-slate-600 {
        color: #333 !important;
      }
      .text-white, .text-slate-100, .text-slate-200, .text-slate-300 {
        color: black !important;
      }
      .bg-slate-800\/40, .bg-slate-800\/30, .bg-amber-500\/5 {
        background: white !important;
        border: 1px solid #ddd !important;
      }
      .text-\[#D4AF37\] {
        color: #B8860B !important;
      }
      .text-emerald-400, .text-amber-300, .text-amber-400, .text-red-400 {
        color: #333 !important;
      }
      .bg-emerald-500\/15, .bg-amber-500\/15 {
        background: white !important;
        border: 1px solid #ddd !important;
      }
    }
    .print-only { display: none; }
  `;

  if (submitted && admissionRef) {
    return (
      <div className="min-h-screen bg-slate-950 relative">
      {/* Logo watermark background for form steps */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0 flex items-center justify-center no-print">
        <Image src="/logo.png" alt="" width={600} height={600} className="object-contain" priority={false} />
      </div>
        <style>{printStyles}</style>
        <div className="admissions-container max-w-4xl mx-auto py-8 px-4">
          {/* Confirmation Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="admission-card bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8"
          >
            <div className="print-header">
              <SchoolDocumentHeader title="Admission Application" subtitle={`Reference: ${admissionRef.slice(0, 8).toUpperCase()}`} />
            </div>

            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white">Application Received</h2>
              <p className="text-slate-400 mt-2 max-w-lg mx-auto">
                Thank you for applying to Bishop Davis Joy Academy. Your application has been received and will be reviewed by our admissions team.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Application Reference</p>
                <p className="text-lg font-mono font-bold text-[#D4AF37]">{admissionRef.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Student Name</p>
                <p className="text-lg font-bold text-white">{form.first_name} {form.last_name}</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Grade Applied</p>
                <p className="text-lg font-bold text-white">{form.grade_applied}</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Date Submitted</p>
                <p className="text-lg font-bold text-white">{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 mb-8">
              <h3 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> What Happens Next?
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  Our admissions team will review your application within 5–7 working days.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  You will be contacted via phone or email regarding the next steps.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  An interview and/or assessment may be scheduled for the applicant.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
                  If processing is delayed, you may be required to appear physically at the school with original documents.
                </li>
              </ul>
            </div>

            {/* Printable Application Summary */}
            <div className="print-only">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-300 pb-2">Application Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Full Name:</strong> {form.first_name} {form.last_name}</div>
                <div><strong>Date of Birth:</strong> {form.date_of_birth}</div>
                <div><strong>Gender:</strong> {form.gender}</div>
                <div><strong>Nationality:</strong> {form.nationality}</div>
                <div><strong>Religion:</strong> {form.religion || "N/A"}</div>
                <div><strong>Birth Cert No:</strong> {form.birth_certificate_no || "N/A"}</div>
                <div><strong>Grade Applied:</strong> {form.grade_applied}</div>
                <div><strong>Previous School:</strong> {form.previous_school || "N/A"}</div>
                <div><strong>Home Address:</strong> {form.home_address || "N/A"}, {form.city || ""}, {form.county || ""}</div>
                <div><strong>Medical Conditions:</strong> {form.medical_conditions || "None"}</div>
                <div><strong>Allergies:</strong> {form.allergies || "None"}</div>
                <div><strong>Parent/Guardian:</strong> {form.parent_name}</div>
                <div><strong>Parent Phone:</strong> {form.parent_phone}</div>
                <div><strong>Parent Email:</strong> {form.parent_email || "N/A"}</div>
                <div><strong>Emergency Contact:</strong> {form.emergency_contact_name || "N/A"} ({form.emergency_contact_relationship || "N/A"}) — {form.emergency_contact_phone || "N/A"}</div>
                <div><strong>Notes:</strong> {form.notes || "N/A"}</div>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-300 text-xs text-slate-500 text-center">
                This document was generated by the Bishop Davis Joy Academy Admissions System.<br/>
                Please retain this copy for your records. Reference: {admissionRef.slice(0, 8).toUpperCase()}
              </div>
            </div>

            <div className="no-print flex flex-wrap gap-3 justify-center">
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-950 transition-all hover:opacity-90 flex items-center gap-2"
                style={{ background: GOLD }}
              >
                <Printer className="w-4 h-4" /> Print Application
              </button>
              <button
                onClick={() => { setSubmitted(false); setForm(emptyForm); setStep(1); setAdmissionRef(null); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-slate-700/50 hover:bg-slate-800/50 transition-all"
              >
                Submit Another Application
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 relative">
      {/* Logo watermark background for form steps */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0 flex items-center justify-center no-print">
        <Image src="/logo.png" alt="" width={600} height={600} className="object-contain" priority={false} />
      </div>
      <style>{printStyles}</style>
      <div className="admissions-container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 mb-4">
            <GraduationCap className="w-7 h-7" style={{ color: GOLD }} />
          </div>
          <h1 className="text-3xl font-bold text-white">Admission Application</h1>
          <p className="text-slate-400 mt-2 max-w-lg mx-auto">
            Apply for enrollment at Bishop Davis Joy Academy. Please complete all required fields accurately.
          </p>
        </motion.div>

        {/* Step Indicator */}
        <div className="no-print mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -z-10" />
            <div
              className="absolute top-1/2 left-0 h-0.5 -z-10 transition-all duration-500"
              style={{
                width: `${((step - 1) / (STEPS.length - 1)) * 100}%`,
                background: `linear-gradient(to right, ${GOLD}, ${GOLD}80)`,
              }}
            />
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isCompleted = s.id < step;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1.5 bg-slate-950 px-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${
                      isActive
                        ? "bg-[#D4AF37] border-[#D4AF37] text-slate-950"
                        : isCompleted
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : "bg-slate-900 border-slate-700 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? "text-[#D4AF37]" : isCompleted ? "text-emerald-400" : "text-slate-600"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="admission-card bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 md:p-8"
        >
          {/* Step 1: Student Information */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5" style={{ color: GOLD }} /> Student Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all ${errors.first_name ? "border-red-500/50" : "border-slate-700/50"}`}
                    placeholder="e.g. John"
                  />
                  {errors.first_name && <p className="text-xs text-red-400 mt-1">{errors.first_name}</p>}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all ${errors.last_name ? "border-red-500/50" : "border-slate-700/50"}`}
                    placeholder="e.g. Doe"
                  />
                  {errors.last_name && <p className="text-xs text-red-400 mt-1">{errors.last_name}</p>}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => updateField("date_of_birth", e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all ${errors.date_of_birth ? "border-red-500/50" : "border-slate-700/50"}`}
                  />
                  {errors.date_of_birth && <p className="text-xs text-red-400 mt-1">{errors.date_of_birth}</p>}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Gender *</label>
                  <select
                    value={form.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all ${errors.gender ? "border-red-500/50" : "border-slate-700/50"}`}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.gender && <p className="text-xs text-red-400 mt-1">{errors.gender}</p>}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nationality</label>
                  <input
                    type="text"
                    value={form.nationality}
                    onChange={(e) => updateField("nationality", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="e.g. Kenyan"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Religion</label>
                  <input
                    type="text"
                    value={form.religion}
                    onChange={(e) => updateField("religion", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="e.g. Christian"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Birth Certificate No.</label>
                  <input
                    type="text"
                    value={form.birth_certificate_no}
                    onChange={(e) => updateField("birth_certificate_no", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="e.g. 12345678"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Passport No. (if applicable)</label>
                  <input
                    type="text"
                    value={form.passport_no}
                    onChange={(e) => updateField("passport_no", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="e.g. A1234567"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Sibling Names (if any)</label>
                  <input
                    type="text"
                    value={form.sibling_names}
                    onChange={(e) => updateField("sibling_names", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="Names of siblings already enrolled or applying"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Academic Background */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5" style={{ color: GOLD }} /> Academic Background
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Grade Applying For *</label>
                  <select
                    value={form.grade_applied}
                    onChange={(e) => updateField("grade_applied", e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all ${errors.grade_applied ? "border-red-500/50" : "border-slate-700/50"}`}
                  >
                    <option value="">Select grade level</option>
                    {gradeLevels.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                  {errors.grade_applied && <p className="text-xs text-red-400 mt-1">{errors.grade_applied}</p>}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Campus *</label>
                  <select
                    value={form.campus_id}
                    onChange={(e) => updateField("campus_id", e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all ${errors.campus_id ? "border-red-500/50" : "border-slate-700/50"}`}
                    disabled={loadingCampuses}
                  >
                    <option value="">
                      {loadingCampuses ? "Loading campuses..." : campuses.length === 0 ? "No campuses available — contact school" : "Select campus"}
                    </option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.location}</option>
                    ))}
                  </select>
                  {!loadingCampuses && campuses.length === 0 && (
                    <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" /> No campuses are currently open for admissions. Please contact the school directly.
                    </p>
                  )}
                  {form.campus_id && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                      {(() => {
                        const c = campuses.find((x) => x.id === form.campus_id);
                        if (!c) return null;
                        return (
                          <div className="space-y-1 text-xs text-slate-400">
                            <p className="text-sm font-semibold text-white">{c.name}</p>
                            <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-[#D4AF37]" /> {c.location}</p>
                            {c.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-[#D4AF37]" /> {c.phone}</p>}
                            {c.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#D4AF37]" /> {c.email}</p>}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {errors.campus_id && <p className="text-xs text-red-400 mt-1">{errors.campus_id}</p>}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Previous School</label>
                  <input
                    type="text"
                    value={form.previous_school}
                    onChange={(e) => updateField("previous_school", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="Name of previous school"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Previous Grade</label>
                  <input
                    type="text"
                    value={form.previous_grade}
                    onChange={(e) => updateField("previous_grade", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="e.g. Grade 3"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Home Address</label>
                  <input
                    type="text"
                    value={form.home_address}
                    onChange={(e) => updateField("home_address", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="e.g. Nairobi"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">County</label>
                  <input
                    type="text"
                    value={form.county}
                    onChange={(e) => updateField("county", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="e.g. Nairobi County"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Country</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="e.g. Kenya"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Health & Medical */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <HeartPulse className="w-5 h-5" style={{ color: GOLD }} /> Health & Medical Information
              </h2>
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 mb-4">
                <p className="text-xs text-amber-300/80 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  This information is kept confidential and is used solely to ensure the safety and wellbeing of your child while at school.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Medical Conditions</label>
                  <textarea
                    value={form.medical_conditions}
                    onChange={(e) => updateField("medical_conditions", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all resize-none"
                    placeholder="List any known medical conditions (e.g. asthma, epilepsy, diabetes)"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Allergies</label>
                  <textarea
                    value={form.allergies}
                    onChange={(e) => updateField("allergies", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all resize-none"
                    placeholder="List any allergies (food, medication, environmental)"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Special Needs / Learning Difficulties</label>
                  <textarea
                    value={form.special_needs}
                    onChange={(e) => updateField("special_needs", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all resize-none"
                    placeholder="Describe any special educational needs or learning difficulties"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Parent/Guardian */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5" style={{ color: GOLD }} /> Parent / Guardian Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={form.parent_name}
                    onChange={(e) => updateField("parent_name", e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all ${errors.parent_name ? "border-red-500/50" : "border-slate-700/50"}`}
                    placeholder="e.g. Jane Doe"
                  />
                  {errors.parent_name && <p className="text-xs text-red-400 mt-1">{errors.parent_name}</p>}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={form.parent_email}
                    onChange={(e) => updateField("parent_email", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="e.g. parent@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={form.parent_phone}
                    onChange={(e) => updateField("parent_phone", e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all ${errors.parent_phone ? "border-red-500/50" : "border-slate-700/50"}`}
                    placeholder="e.g. +254 712 345 678"
                  />
                  {errors.parent_phone && <p className="text-xs text-red-400 mt-1">{errors.parent_phone}</p>}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Occupation</label>
                  <input
                    type="text"
                    value={form.parent_occupation}
                    onChange={(e) => updateField("parent_occupation", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="e.g. Teacher, Engineer"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ID Number</label>
                  <input
                    type="text"
                    value={form.parent_id_number}
                    onChange={(e) => updateField("parent_id_number", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="National ID or Passport"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Address</label>
                  <input
                    type="text"
                    value={form.parent_address}
                    onChange={(e) => updateField("parent_address", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="Parent/guardian address (if different from student)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Emergency Contact */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield className="w-5 h-5" style={{ color: GOLD }} /> Emergency Contact
              </h2>
              <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4 mb-4">
                <p className="text-xs text-red-300/80 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Please provide an emergency contact who can be reached if the parent/guardian is unavailable.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={form.emergency_contact_name}
                    onChange={(e) => updateField("emergency_contact_name", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="e.g. Michael Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={form.emergency_contact_relationship}
                    onChange={(e) => updateField("emergency_contact_relationship", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="e.g. Uncle, Aunt, Grandparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={form.emergency_contact_phone}
                    onChange={(e) => updateField("emergency_contact_phone", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                    placeholder="e.g. +254 723 456 789"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Review & Submit */}
          {step === 6 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: GOLD }} /> Review & Submit
              </h2>
              <div className="space-y-4">
                <ReviewSection title="Student Information" icon={User}>
                  <ReviewItem label="Name" value={`${form.first_name} ${form.last_name}`} />
                  <ReviewItem label="Date of Birth" value={form.date_of_birth} />
                  <ReviewItem label="Gender" value={form.gender} />
                  <ReviewItem label="Nationality" value={form.nationality} />
                  <ReviewItem label="Religion" value={form.religion || "—"} />
                </ReviewSection>
                <ReviewSection title="Academic Background" icon={BookOpen}>
                  <ReviewItem label="Grade Applied" value={form.grade_applied} />
                  <ReviewItem label="Campus" value={campuses.find((c) => c.id === form.campus_id)?.name || form.campus_id} />
                  <ReviewItem label="Previous School" value={form.previous_school || "—"} />
                  <ReviewItem label="Address" value={`${form.home_address}${form.city ? `, ${form.city}` : ""}${form.county ? `, ${form.county}` : ""}`} />
                </ReviewSection>
                <ReviewSection title="Health & Medical" icon={HeartPulse}>
                  <ReviewItem label="Medical Conditions" value={form.medical_conditions || "None stated"} />
                  <ReviewItem label="Allergies" value={form.allergies || "None stated"} />
                  <ReviewItem label="Special Needs" value={form.special_needs || "None stated"} />
                </ReviewSection>
                <ReviewSection title="Parent/Guardian" icon={Users}>
                  <ReviewItem label="Name" value={form.parent_name} />
                  <ReviewItem label="Phone" value={form.parent_phone} />
                  <ReviewItem label="Email" value={form.parent_email || "—"} />
                  <ReviewItem label="Occupation" value={form.parent_occupation || "—"} />
                </ReviewSection>
                <ReviewSection title="Emergency Contact" icon={Shield}>
                  <ReviewItem label="Name" value={form.emergency_contact_name || "—"} />
                  <ReviewItem label="Relationship" value={form.emergency_contact_relationship || "—"} />
                  <ReviewItem label="Phone" value={form.emergency_contact_phone || "—"} />
                </ReviewSection>
                {form.notes && (
                  <ReviewSection title="Additional Notes" icon={FileText}>
                    <p className="text-sm text-slate-400">{form.notes}</p>
                  </ReviewSection>
                )}
              </div>
              <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-[#D4AF37] focus:ring-[#D4AF37]/20" />
                  <span className="text-sm text-slate-400">
                    I confirm that all information provided is accurate and complete to the best of my knowledge. I understand that providing false information may result in the rejection of this application or termination of enrollment.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="no-print flex items-center justify-between mt-8 pt-6 border-t border-slate-700/40">
            <button
              onClick={prevStep}
              disabled={step === 1}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-slate-700/50 hover:bg-slate-800/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
            {step < STEPS.length ? (
              <button
                onClick={nextStep}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-950 transition-all hover:opacity-90 flex items-center gap-2"
                style={{ background: GOLD }}
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-950 transition-all hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
                style={{ background: GOLD }}
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit Application</>}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ReviewSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: GOLD }} /> {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-slate-300">{value || "—"}</p>
    </div>
  );
}
