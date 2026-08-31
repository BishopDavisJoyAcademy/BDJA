"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import {
  CheckCircle2, ChevronRight, ChevronLeft, User, Bell, Shield,
  Sparkles, BookOpen, GraduationCap, Users, MessageSquare,
  Calendar, FileText, BarChart3, Palette, Moon, Sun, Monitor,
  Smartphone, Mail, Check, AlertCircle, Loader2, Camera,
  School, ArrowRight, Star, Zap, Heart, Lock, Eye, EyeOff
} from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  user_category: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  campus_id: string | null;
}

interface Campus {
  id: string;
  name: string;
}

const STEPS = [
  { id: 1, label: "Welcome", icon: Sparkles },
  { id: 2, label: "Profile", icon: User },
  { id: 3, label: "Preferences", icon: Palette },
  { id: 4, label: "Terms", icon: Shield },
  { id: 5, label: "Features", icon: Zap },
  { id: 6, label: "Done", icon: CheckCircle2 },
];

const CATEGORY_CONFIG: Record<string, { color: string; gradient: string; icon: React.ElementType; greeting: string }> = {
  student: { color: "emerald", gradient: "from-emerald-500 to-teal-600", icon: GraduationCap, greeting: "Ready to learn?" },
  staff: { color: "amber", gradient: "from-amber-500 to-orange-600", icon: Users, greeting: "Ready to teach?" },
  parent: { color: "blue", gradient: "from-blue-500 to-indigo-600", icon: Heart, greeting: "Stay connected" },
  admin: { color: "purple", gradient: "from-purple-500 to-violet-600", icon: Shield, greeting: "Command center ready" },
};

const FEATURES: Record<string, Array<{ title: string; desc: string; icon: React.ElementType }>> = {
  student: [
    { title: "Grades & Reports", desc: "Track your academic progress in real-time", icon: BarChart3 },
    { title: "Timetable", desc: "Never miss a class with your personal schedule", icon: Calendar },
    { title: "Assignments", desc: "Submit work and get feedback from teachers", icon: FileText },
    { title: "Joy AI", desc: "Your personal AI learning assistant", icon: MessageSquare },
  ],
  staff: [
    { title: "Class Management", desc: "Manage classes, attendance, and grades", icon: Users },
    { title: "Assessments", desc: "Create and grade student assessments", icon: FileText },
    { title: "Timetable", desc: "View and manage your teaching schedule", icon: Calendar },
    { title: "Resources", desc: "Access teaching materials and library", icon: BookOpen },
  ],
  parent: [
    { title: "Child Progress", desc: "Monitor grades, attendance, and behavior", icon: BarChart3 },
    { title: "Fee Payments", desc: "View and pay school fees online", icon: Shield },
    { title: "Communication", desc: "Message teachers and school admin", icon: MessageSquare },
    { title: "Calendar", desc: "School events, holidays, and meetings", icon: Calendar },
  ],
  admin: [
    { title: "Staff Management", desc: "Add, edit, and manage all staff", icon: Users },
    { title: "Student Records", desc: "Full student database and admissions", icon: GraduationCap },
    { title: "Analytics", desc: "School-wide performance dashboards", icon: BarChart3 },
    { title: "Settings", desc: "Configure school policies and system", icon: Shield },
  ],
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  // Form state
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
    campus_id: "",
    theme: "system",
    language: "en",
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    terms_accepted: false,
  });

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load profile");
        setLoading(false);
        return;
      }

      const user = data.user as UserProfile;
      setProfile(user);
      setForm((prev) => ({
        ...prev,
        full_name: user.full_name || "",
        phone: user.phone || "",
        avatar_url: user.avatar_url || "",
        campus_id: user.campus_id || "",
      }));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
    // Fetch campuses
    fetch("/api/campuses")
      .then((r) => r.json())
      .then((d) => setCampuses(d.campuses || []))
      .catch(() => {});
  }, [fetchProfile]);

  const handleNext = () => {
    if (step === 4 && !form.terms_accepted) {
      toast.error("Please accept the terms and policies to continue");
      return;
    }
    if (step < 6) {
      setDirection("next");
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setDirection("prev");
      setStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please log in again.");
        router.push("/login");
        return;
      }

      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: form.full_name,
          phone: form.phone || null,
          avatar_url: form.avatar_url || null,
          preferences: {
            theme: form.theme,
            language: form.language,
            email_notifications: form.email_notifications,
            sms_notifications: form.sms_notifications,
            push_notifications: form.push_notifications,
          },
          terms_accepted: form.terms_accepted,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to complete onboarding");
        setSubmitting(false);
        return;
      }

      setCompleted(true);
      toast.success("Welcome to BDJA! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2500);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const category = profile?.user_category || "student";
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.student;
  const CategoryIcon = config.icon;
  const features = FEATURES[category] || FEATURES.student;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/20 rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10 bg-gradient-to-br ${config.gradient} blur-3xl`} />
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 bg-gradient-to-br ${config.gradient} blur-3xl`} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-2">
            <School className="w-6 h-6 text-amber-400" />
            <span className="font-bold text-lg">BDJA</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Step {step} of {STEPS.length - 1}</span>
          </div>
        </header>

        {/* Progress bar */}
        <div className="px-6 py-3">
          <div className="flex gap-1.5">
            {STEPS.slice(0, -1).map((s) => (
              <div key={s.id} className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    step > s.id
                      ? `bg-gradient-to-r ${config.gradient}`
                      : step === s.id
                      ? "bg-slate-600"
                      : "bg-transparent"
                  }`}
                  style={{ width: step > s.id ? "100%" : step === s.id ? "60%" : "0%" }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-2xl">
            {/* Step 1: Welcome */}
            {step === 1 && (
              <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${config.gradient} shadow-lg`}>
                  <CategoryIcon className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                    Welcome, {profile?.full_name?.split(" ")[0] || "there"}!
                  </h1>
                  <p className="text-gray-400 text-lg">
                    {config.greeting}
                  </p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 max-w-md mx-auto">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Bishop Davis Joy Academy — where <span className="text-amber-400 font-medium">Prayer, Commitment and Hard Work</span> lead to Success. Let&apos;s set up your account in just a few steps.
                  </p>
                </div>
                <div className="flex justify-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Personalized</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Quick</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Profile */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-1">Complete Your Profile</h2>
                  <p className="text-gray-400 text-sm">This helps us personalize your experience</p>
                </div>

                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 space-y-5">
                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center text-3xl font-bold text-white shadow-lg`}>
                        {form.avatar_url ? (
                          <Image src={form.avatar_url} alt="Profile avatar" width={96} height={96} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          form.full_name?.charAt(0).toUpperCase() || "?"
                        )}
                      </div>
                      <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center hover:bg-slate-600 transition-colors">
                        <Camera className="w-4 h-4 text-gray-300" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Avatar upload coming soon</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                      <input
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone Number</label>
                      <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                        placeholder="+254..."
                      />
                    </div>
                    {campuses.length > 0 && (
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Campus</label>
                        <select
                          value={form.campus_id}
                          onChange={(e) => setForm({ ...form, campus_id: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                        >
                          <option value="">Select campus</option>
                          {campuses.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Preferences */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-1">Your Preferences</h2>
                  <p className="text-gray-400 text-sm">Customize how you use BDJA</p>
                </div>

                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 space-y-5">
                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "light", icon: Sun, label: "Light" },
                        { value: "dark", icon: Moon, label: "Dark" },
                        { value: "system", icon: Monitor, label: "Auto" },
                      ].map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setForm({ ...form, theme: t.value })}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                            form.theme === t.value
                              ? `border-amber-500/50 bg-amber-500/10`
                              : "border-slate-700 bg-slate-800/30 hover:bg-slate-800/50"
                          }`}
                        >
                          <t.icon className={`w-5 h-5 ${form.theme === t.value ? "text-amber-400" : "text-gray-400"}`} />
                          <span className={`text-sm ${form.theme === t.value ? "text-white font-medium" : "text-gray-400"}`}>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Language</label>
                    <select
                      value={form.language}
                      onChange={(e) => setForm({ ...form, language: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="en">English</option>
                      <option value="sw">Kiswahili</option>
                    </select>
                  </div>

                  {/* Notifications */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Notifications</label>
                    <div className="space-y-3">
                      {[
                        { key: "email_notifications", icon: Mail, label: "Email notifications" },
                        { key: "sms_notifications", icon: Smartphone, label: "SMS notifications" },
                        { key: "push_notifications", icon: Bell, label: "Push notifications" },
                      ].map((n) => (
                        <label key={n.key} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 cursor-pointer hover:bg-slate-800/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={form[n.key as keyof typeof form] as boolean}
                            onChange={(e) => setForm({ ...form, [n.key]: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-600 text-amber-400 focus:ring-amber-500/30"
                          />
                          <n.icon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-300">{n.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Terms */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-1">Terms & Policies</h2>
                  <p className="text-gray-400 text-sm">Please review before continuing</p>
                </div>

                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                  <div className="p-4 bg-slate-800/50 border-b border-slate-700/50 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-400" />
                    <span className="font-medium text-white">School Policies & Code of Conduct</span>
                  </div>
                  <div className="p-4 h-64 overflow-y-auto text-sm text-gray-400 space-y-4 leading-relaxed">
                    <p>
                      <strong className="text-gray-300">1. Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials. Do not share your password with anyone.
                    </p>
                    <p>
                      <strong className="text-gray-300">2. Acceptable Use:</strong> The BDJA platform is for educational purposes only. Any misuse, harassment, or inappropriate content will result in account suspension.
                    </p>
                    <p>
                      <strong className="text-gray-300">3. Data Privacy:</strong> Your personal information is protected under our privacy policy. We do not share your data with third parties without consent.
                    </p>
                    <p>
                      <strong className="text-gray-300">4. Academic Integrity:</strong> All work submitted through the platform must be your own. Plagiarism and cheating are strictly prohibited.
                    </p>
                    <p>
                      <strong className="text-gray-300">5. Communication:</strong> All messages and communications must be respectful and professional. The school reserves the right to monitor communications for safety.
                    </p>
                    <p>
                      <strong className="text-gray-300">6. Platform Access:</strong> Access to the platform may be revoked at any time for violations of school policy or code of conduct.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 cursor-pointer hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.terms_accepted}
                    onChange={(e) => setForm({ ...form, terms_accepted: e.target.checked })}
                    className="w-5 h-5 mt-0.5 rounded border-gray-600 text-amber-400 focus:ring-amber-500/30"
                  />
                  <div>
                    <p className="text-sm text-gray-300">
                      I have read and agree to the <span className="text-amber-400 font-medium">School Policies & Code of Conduct</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      By checking this box, you acknowledge that you understand and will abide by all school policies.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Step 5: Features */}
            {step === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-1">What You Can Do</h2>
                  <p className="text-gray-400 text-sm">Explore the key features of your BDJA account</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {features.map((f, i) => (
                    <div
                      key={i}
                      className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-700/50 hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5"
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        <f.icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-1">{f.title}</h3>
                      <p className="text-sm text-gray-400">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Celebration */}
            {step === 6 && (
              <div className="text-center space-y-6 animate-in zoom-in-95 duration-700">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </div>
                  {/* Confetti dots */}
                  <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                  <div className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-blue-400 animate-ping" style={{ animationDelay: "0.2s" }} />
                  <div className="absolute top-2 -left-4 w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" style={{ animationDelay: "0.4s" }} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">You&apos;re All Set!</h2>
                  <p className="text-gray-400">
                    Welcome to the BDJA family, {profile?.full_name?.split(" ")[0] || "there"}.
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <div className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-gray-400">
                    <Check className="w-3 h-3 inline text-emerald-400 mr-1" /> Profile ready
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-gray-400">
                    <Check className="w-3 h-3 inline text-emerald-400 mr-1" /> Preferences saved
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-gray-400">
                    <Check className="w-3 h-3 inline text-emerald-400 mr-1" /> Terms accepted
                  </div>
                </div>
                <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
                <div className="w-48 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-[shimmer_2s_ease-in-out_infinite]" style={{ width: "100%" }} />
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer navigation */}
        {step < 6 && (
          <footer className="px-6 py-4 border-t border-slate-800/50">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={step === 1}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  step === 1
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              {step < 5 ? (
                <button
                  onClick={handleNext}
                  className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-opacity shadow-lg`}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50`}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Get Started</>
                  )}
                </button>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
