"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { apiGet, apiPut } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

interface PlatformSettings {
  id?: string; school_name: string; school_tagline: string; school_address: string; school_phone: string; school_email: string;
  school_website: string; timezone: string; currency: string; academic_year_start: string; academic_year_end: string;
  grading_system: string; max_class_size: number; enable_online_payments: boolean; enable_parent_portal: boolean;
  enable_staff_portal: boolean; enable_student_portal: boolean; maintenance_mode: boolean; updated_at?: string;
}

const TIMEZONES = ["Africa/Nairobi", "UTC", "Africa/Lagos", "Africa/Johannesburg", "Europe/London", "America/New_York"];
const CURRENCIES = ["KES", "USD", "EUR", "GBP", "NGN", "ZAR"];
const GRADING_SYSTEMS = ["percentage", "letter", "gpa", "kenyan_8-4-4", "cbc"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/api/admin/settings")
      .then((d) => {
        if (d.settings) setSettings(d.settings);
        else setSettings(getDefaults());
        setLoading(false);
      })
      .catch((err) => { setError(getErrorMessage(err)); setSettings(getDefaults()); setLoading(false); });
  }, []);

  const getDefaults = (): PlatformSettings => ({
    school_name: "Bishop Davis Joy Academy", school_tagline: "Excellence in Education", school_address: "", school_phone: "", school_email: "",
    school_website: "https://bdja.ac.ke", timezone: "Africa/Nairobi", currency: "KES", academic_year_start: "", academic_year_end: "",
    grading_system: "kenyan_8-4-4", max_class_size: 40, enable_online_payments: false, enable_parent_portal: true,
    enable_staff_portal: true, enable_student_portal: true, maintenance_mode: false,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); if (!settings) return;
    setSaving(true);
    try {
      await apiPut("/api/admin/settings", settings);
      toast.success("Settings saved successfully");
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setSaving(false); }
  };

  const update = (key: keyof PlatformSettings, value: unknown) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : null);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div></div>;
  if (!settings) return <div className="p-4 bg-red-500/10 text-red-400 rounded-xl flex items-center gap-2 border border-red-500/20"><AlertCircle className="w-5 h-5" />{error || "Failed to load settings"}</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-white flex items-center gap-2"><Settings className="w-6 h-6 text-amber-400" /> Platform Settings</h1><p className="text-gray-400 mt-1">Configure your school platform</p></div>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold text-white">School Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">School Name</label><input value={settings.school_name} onChange={(e) => update("school_name", e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Tagline</label><input value={settings.school_tagline} onChange={(e) => update("school_tagline", e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300 mb-1.5">Address</label><input value={settings.school_address} onChange={(e) => update("school_address", e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Phone</label><input value={settings.school_phone} onChange={(e) => update("school_phone", e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label><input type="email" value={settings.school_email} onChange={(e) => update("school_email", e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Website</label><input value={settings.school_website} onChange={(e) => update("school_website", e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold text-white">Academic Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Timezone</label>
              <select value={settings.timezone} onChange={(e) => update("timezone", e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50">{TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            </div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Currency</label>
              <select value={settings.currency} onChange={(e) => update("currency", e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50">{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Grading System</label>
              <select value={settings.grading_system} onChange={(e) => update("grading_system", e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50">{GRADING_SYSTEMS.map((g) => <option key={g} value={g}>{g.replace(/_/g, " ").toUpperCase()}</option>)}</select>
            </div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Max Class Size</label><input type="number" value={settings.max_class_size} onChange={(e) => update("max_class_size", parseInt(e.target.value) || 40)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Academic Year Start</label><input type="date" value={settings.academic_year_start} onChange={(e) => update("academic_year_start", e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Academic Year End</label><input type="date" value={settings.academic_year_end} onChange={(e) => update("academic_year_end", e.target.value)} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50" /></div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-white">Feature Toggles</h3>
          {[
            { key: "enable_parent_portal" as const, label: "Parent Portal" },
            { key: "enable_staff_portal" as const, label: "Staff Portal" },
            { key: "enable_student_portal" as const, label: "Student Portal" },
            { key: "enable_online_payments" as const, label: "Online Payments" },
            { key: "maintenance_mode" as const, label: "Maintenance Mode" },
          ].map((toggle) => (
            <label key={toggle.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/30 border border-slate-700/30 cursor-pointer hover:border-slate-600 transition-all">
              <span className="text-sm text-gray-300">{toggle.label}</span>
              <input type="checkbox" checked={!!settings[toggle.key]} onChange={(e) => update(toggle.key, e.target.checked)} className="w-5 h-5 rounded border-slate-600 text-amber-500 bg-slate-900 focus:ring-amber-500/20" />
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => window.location.reload()} className="px-6 py-2.5 rounded-xl border border-slate-600 text-gray-300 hover:bg-slate-700/50 transition-all text-sm font-medium flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? "Saving..." : "Save Settings"}</button>
        </div>
      </form>
    </div>
  );
}
