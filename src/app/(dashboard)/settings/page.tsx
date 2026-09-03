"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Bell, Palette, Shield, Settings, Save, Loader2,
  Camera, Mail, Phone, MapPin, School, GraduationCap,
  Briefcase, Building, Moon, Sun, Monitor, Globe,
  Eye, EyeOff, CheckCircle2, AlertCircle, ChevronRight,
  LogOut, KeyRound, Hash, Fingerprint, Sparkles, X,
  ToggleLeft, ToggleRight, Volume2, VolumeX
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const GOLD = "#D4AF37";
const GOLD_LIGHT = "#E8C84A";

// ─── Types ───
interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  user_category: string;
  campus_id: string | null;
  department?: string | null;
  designation?: string | null;
  admission_number?: string | null;
  grade_level?: string | null;
}

interface UserPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  theme: "dark" | "light" | "system";
  language: string;
}

// ─── Toggle Switch Component ───
function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
          checked ? "" : "bg-slate-700"
        }`}
        style={{ background: checked ? GOLD : undefined }}
      >
        <motion.div
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

// ─── Theme Card ───
function ThemeCard({
  theme,
  active,
  onClick,
  icon: Icon,
  label,
}: {
  theme: string;
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-4 rounded-xl border text-left transition-all ${
        active
          ? "border-amber-400/50 bg-amber-400/5"
          : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50"
      }`}
    >
      {active && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="w-4 h-4" style={{ color: GOLD }} />
        </div>
      )}
      <Icon className={`w-6 h-6 mb-2 ${active ? "text-amber-400" : "text-slate-500"}`} />
      <p className={`text-sm font-medium ${active ? "text-white" : "text-slate-400"}`}>{label}</p>
    </motion.button>
  );
}

// ─── Section Card ───
function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-slate-700/30 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}25` }}>
          <Icon className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </motion.div>
  );
}

// ─── Input Field ───
function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  placeholder = "",
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full ${Icon ? "pl-10" : "pl-3"} pr-3 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none transition-all ${
            disabled ? "opacity-60 cursor-not-allowed" : "focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
          }`}
        />
        {disabled && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Read-only</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<ProfileData>({
    id: "", full_name: "", email: "", phone: "", avatar_url: null,
    role: "", user_category: "", campus_id: null,
  });

  // Preferences state
  const [prefs, setPrefs] = useState<UserPreferences>({
    email_notifications: true,
    sms_notifications: false,
    theme: "dark",
    language: "en",
  });

  // Security state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStudent = user?.user_category === "student";
  const isStaff = user?.user_category === "staff";
  const isParent = user?.user_category === "parent";
  const isAdmin = user?.user_category === "admin";

  // Define tabs based on role
  const tabs = [
    { key: "profile", label: "Profile", icon: User },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "appearance", label: "Appearance", icon: Palette },
    { key: "security", label: "Security", icon: Shield },
    ...(isAdmin ? [{ key: "platform", label: "Platform", icon: Settings }] : []),
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load profile and preferences
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        // Load profile
        const { data: { session: s } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

        const [profileRes, prefsRes] = await Promise.all([
          fetch("/api/settings/profile", { headers }),
          fetch("/api/settings/preferences", { headers }),
        ]);

        if (profileRes.ok) {
          const p = await profileRes.json();
          if (p.profile) setProfile(p.profile);
        }
        if (prefsRes.ok) {
          const p = await prefsRes.json();
          if (p.preferences) setPrefs((prev) => ({ ...prev, ...p.preferences }));
        }
      } catch (err) {
        console.error("[Settings] Load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          full_name: profile.full_name,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
        }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      toast.success("Profile updated");
      refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrefs = async () => {
    setSaving(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch("/api/settings/preferences", {
        method: "PUT",
        headers,
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      toast.success("Preferences saved");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      toast.error(isStudent ? "PINs do not match" : "Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers,
        body: JSON.stringify({
          current_password: currentPwd,
          new_password: newPwd,
          confirm_password: confirmPwd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");

      toast.success(data.message || "Password changed. Please log in again.");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");

      // Sign out after password change
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }, 2000);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setSaving(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Avatar uploaded");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage your profile, preferences, and account security
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5" style={{ color: GOLD }} />
          <span className="capitalize">{user?.user_category || "User"}</span>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="lg:w-56 shrink-0">
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
                style={activeTab === tab.key ? { background: `${GOLD}15`, border: `1px solid ${GOLD}25` } : { border: "1px solid transparent" }}
              >
                <tab.icon className="w-4 h-4" style={{ color: activeTab === tab.key ? GOLD : undefined }} />
                {tab.label}
                {activeTab === tab.key && <ChevronRight className="w-4 h-4 ml-auto" style={{ color: GOLD }} />}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {/* ─── PROFILE TAB ─── */}
            {activeTab === "profile" && (
              <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}
                className="space-y-6">
                {/* Avatar */}
                <SectionCard title="Profile Picture" icon={Camera}>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-700/50"
                        style={{ background: profile.avatar_url ? undefined : `${GOLD}15` }}>
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-10 h-10" style={{ color: `${GOLD}80` }} />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg"
                        style={{ background: GOLD }}
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{profile.full_name || "Your Name"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{profile.email}</p>
                      <p className="text-xs text-slate-600 mt-1">JPG, PNG or GIF. Max 2MB.</p>
                    </div>
                  </div>
                </SectionCard>

                {/* Personal Info */}
                <SectionCard title="Personal Information" icon={User}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Full Name" value={profile.full_name} onChange={(v) => setProfile((p) => ({ ...p, full_name: v }))} icon={User} />
                    <Field label="Email" value={profile.email} disabled icon={Mail} />
                    <Field label="Phone" value={profile.phone || ""} onChange={(v) => setProfile((p) => ({ ...p, phone: v }))} icon={Phone} placeholder="+254..." />
                    {isStudent && (
                      <>
                        <Field label="Admission Number" value={profile.admission_number || ""} disabled icon={Hash} />
                        <Field label="Grade Level" value={profile.grade_level || ""} disabled icon={GraduationCap} />
                      </>
                    )}
                    {(isStaff || isAdmin) && (
                      <>
                        <Field label="Department" value={profile.department || ""} disabled icon={Building} />
                        <Field label="Designation" value={profile.designation || ""} disabled icon={Briefcase} />
                      </>
                    )}
                  </div>
                  <div className="pt-4 flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                      style={{ background: GOLD, color: "#0a1628" }}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Profile
                    </motion.button>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ─── NOTIFICATIONS TAB ─── */}
            {activeTab === "notifications" && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}
                className="space-y-6">
                <SectionCard title="Notification Preferences" icon={Bell}>
                  <Toggle
                    checked={prefs.email_notifications}
                    onChange={(v) => setPrefs((p) => ({ ...p, email_notifications: v }))}
                    label="Email Notifications"
                    description="Receive updates about grades, assignments, and announcements via email."
                  />
                  <div className="border-t border-slate-700/30" />
                  <Toggle
                    checked={prefs.sms_notifications}
                    onChange={(v) => setPrefs((p) => ({ ...p, sms_notifications: v }))}
                    label="SMS Notifications"
                    description="Receive urgent alerts and reminders via text message."
                  />
                  <div className="pt-4 flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSavePrefs}
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                      style={{ background: GOLD, color: "#0a1628" }}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Preferences
                    </motion.button>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ─── APPEARANCE TAB ─── */}
            {activeTab === "appearance" && (
              <motion.div key="appearance" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}
                className="space-y-6">
                <SectionCard title="Theme" icon={Palette}>
                  <div className="grid grid-cols-3 gap-3">
                    <ThemeCard theme="dark" active={prefs.theme === "dark"} onClick={() => setPrefs((p) => ({ ...p, theme: "dark" }))} icon={Moon} label="Dark" />
                    <ThemeCard theme="light" active={prefs.theme === "light"} onClick={() => setPrefs((p) => ({ ...p, theme: "light" }))} icon={Sun} label="Light" />
                    <ThemeCard theme="system" active={prefs.theme === "system"} onClick={() => setPrefs((p) => ({ ...p, theme: "system" }))} icon={Monitor} label="System" />
                  </div>
                </SectionCard>

                <SectionCard title="Language" icon={Globe}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {["en", "sw", "fr", "es"].map((lang) => (
                      <motion.button
                        key={lang}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPrefs((p) => ({ ...p, language: lang }))}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          prefs.language === lang
                            ? "border-amber-400/50 bg-amber-400/5"
                            : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50"
                        }`}
                      >
                        <p className={`text-sm font-medium ${prefs.language === lang ? "text-white" : "text-slate-400"}`}>
                          {lang === "en" ? "English" : lang === "sw" ? "Swahili" : lang === "fr" ? "French" : "Spanish"}
                        </p>
                        {prefs.language === lang && (
                          <CheckCircle2 className="w-3.5 h-3.5 mx-auto mt-1" style={{ color: GOLD }} />
                        )}
                      </motion.button>
                    ))}
                  </div>
                  <div className="pt-4 flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSavePrefs}
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                      style={{ background: GOLD, color: "#0a1628" }}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Preferences
                    </motion.button>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ─── SECURITY TAB ─── */}
            {activeTab === "security" && (
              <motion.div key="security" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}
                className="space-y-6">
                <SectionCard title={isStudent ? "Change PIN" : "Change Password"} icon={Shield}>
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Current {isStudent ? "PIN" : "Password"}
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrent ? "text" : isStudent ? "tel" : "password"}
                          inputMode={isStudent ? "numeric" : undefined}
                          value={currentPwd}
                          onChange={(e) => isStudent ? setCurrentPwd(e.target.value.replace(/\D/g, "")) : setCurrentPwd(e.target.value)}
                          required
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
                          placeholder={isStudent ? "Enter current PIN" : "Enter current password"}
                        />
                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                          {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                        New {isStudent ? "PIN" : "Password"}
                      </label>
                      <div className="relative">
                        <input
                          type={showNew ? "text" : isStudent ? "tel" : "password"}
                          inputMode={isStudent ? "numeric" : undefined}
                          value={newPwd}
                          onChange={(e) => isStudent ? setNewPwd(e.target.value.replace(/\D/g, "")) : setNewPwd(e.target.value)}
                          required
                          minLength={isStudent ? 4 : 8}
                          maxLength={isStudent ? 8 : 128}
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
                          placeholder={isStudent ? "Create new PIN" : "Create strong password"}
                        />
                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {isStudent && (
                        <p className="text-[11px] text-slate-600">4–8 digits only</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Confirm {isStudent ? "PIN" : "Password"}
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirm ? "text" : isStudent ? "tel" : "password"}
                          inputMode={isStudent ? "numeric" : undefined}
                          value={confirmPwd}
                          onChange={(e) => isStudent ? setConfirmPwd(e.target.value.replace(/\D/g, "")) : setConfirmPwd(e.target.value)}
                          required
                          minLength={isStudent ? 4 : 8}
                          maxLength={isStudent ? 8 : 128}
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
                          placeholder={isStudent ? "Confirm new PIN" : "Re-enter password"}
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={saving}
                      className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      style={{ background: GOLD, color: "#0a1628" }}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                      {isStudent ? "Change PIN" : "Change Password"}
                    </motion.button>
                  </form>
                </SectionCard>

                {/* Danger Zone */}
                <SectionCard title="Account Actions" icon={LogOut}>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-white">Sign Out</p>
                      <p className="text-xs text-slate-500">Sign out of your account on this device.</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.href = "/login";
                      }}
                      className="px-4 py-2 rounded-xl text-sm font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Sign Out
                    </motion.button>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ─── PLATFORM TAB (Admin Only) ─── */}
            {activeTab === "platform" && isAdmin && (
              <motion.div key="platform" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}
                className="space-y-6">
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 text-center">
                  <Settings className="w-12 h-12 mx-auto mb-3" style={{ color: GOLD }} />
                  <h3 className="text-lg font-semibold text-white">Platform Settings</h3>
                  <p className="text-sm text-slate-400 mt-1">Manage school-wide configuration</p>
                  <motion.a
                    href="/admin/settings"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                    style={{ background: GOLD, color: "#0a1628" }}
                  >
                    Open Platform Settings
                    <ChevronRight className="w-4 h-4" />
                  </motion.a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
