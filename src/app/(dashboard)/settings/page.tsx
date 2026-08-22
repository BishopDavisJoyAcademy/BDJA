"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { supabase } from "@/lib/supabase-client";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Loader2, Save, School, Mail, Phone, MapPin, Clock, CalendarDays, Palette, Shield, Bell, Database, Upload, X, CheckCircle
} from "lucide-react";
import { toast } from "sonner";

interface PlatformSettings {
  school_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  timezone: string;
  academic_year: string;
  term_start: string;
  term_end: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_from: string;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  enable_parent_portal: boolean;
  enable_vora: boolean;
  enable_library: boolean;
  max_file_upload_mb: number;
  backup_frequency: string;
}

const TABS = [
  { key: "general", label: "General", icon: School },
  { key: "academics", label: "Academics", icon: CalendarDays },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "communication", label: "Communication", icon: Mail },
  { key: "security", label: "Security", icon: Shield },
  { key: "features", label: "Features", icon: Bell },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({
    school_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    timezone: "Africa/Nairobi",
    academic_year: "",
    term_start: "",
    term_end: "",
    logo_url: "",
    favicon_url: "",
    primary_color: "#F59E0B",
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_from: "",
    enable_email_notifications: true,
    enable_sms_notifications: false,
    enable_parent_portal: true,
    enable_vora: true,
    enable_library: true,
    max_file_upload_mb: 10,
    backup_frequency: "daily",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    apiGet<{ settings: PlatformSettings | null }>("/api/admin/settings")
      .then((d) => {
        if (d.settings) setSettings((prev) => ({ ...prev, ...d.settings }));
        setLoading(false);
      })
      .catch((err) => { toast.error(getErrorMessage(err)); setLoading(false); });
  }, []);

  const handleChange = (field: keyof PlatformSettings, value: string | boolean | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { session: setSession } } = await supabase.auth.getSession();
      const setToken = setSession?.access_token || "";
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${setToken}` },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast.success("Settings saved successfully");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
          <p className="text-sm text-gray-400 mt-1">Configure your school management system</p>
        </div>
        <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save All Changes
        </Button>
      </div>

      <div className="flex gap-1 border-b border-gray-700 pb-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "text-amber-400 border-b-2 border-amber-400 bg-amber-400/5"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General */}
        {activeTab === "general" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2"><School className="w-4 h-4 text-amber-400" /> School Information</h3>
              <div>
                <label className="block text-sm text-gray-400 mb-1">School Name *</label>
                <Input value={settings.school_name} onChange={(e) => handleChange("school_name", e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Contact Email *</label>
                <Input type="email" value={settings.contact_email} onChange={(e) => handleChange("contact_email", e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Contact Phone</label>
                <Input value={settings.contact_phone} onChange={(e) => handleChange("contact_phone", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Address</label>
                <Input value={settings.address} onChange={(e) => handleChange("address", e.target.value)} />
              </div>
            </Card>
            <Card className="p-5 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /> Regional Settings</h3>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Timezone *</label>
                <Input value={settings.timezone} onChange={(e) => handleChange("timezone", e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Academic Year *</label>
                <Input value={settings.academic_year} onChange={(e) => handleChange("academic_year", e.target.value)} placeholder="2025/2026" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max File Upload (MB)</label>
                <Input type="number" min={1} max={100} value={settings.max_file_upload_mb} onChange={(e) => handleChange("max_file_upload_mb", parseInt(e.target.value) || 10)} />
              </div>
            </Card>
          </div>
        )}

        {/* Academics */}
        {activeTab === "academics" && (
          <Card className="p-5 space-y-4 max-w-xl">
            <h3 className="font-semibold text-white flex items-center gap-2"><CalendarDays className="w-4 h-4 text-amber-400" /> Term Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Term Start Date</label>
                <Input type="date" value={settings.term_start} onChange={(e) => handleChange("term_start", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Term End Date</label>
                <Input type="date" value={settings.term_end} onChange={(e) => handleChange("term_end", e.target.value)} />
              </div>
            </div>
          </Card>
        )}

        {/* Branding */}
        {activeTab === "branding" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2"><Palette className="w-4 h-4 text-amber-400" /> Appearance</h3>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={settings.primary_color} onChange={(e) => handleChange("primary_color", e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                  <Input value={settings.primary_color} onChange={(e) => handleChange("primary_color", e.target.value)} className="flex-1" />
                </div>
              </div>
            </Card>
            <Card className="p-5 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2"><Upload className="w-4 h-4 text-amber-400" /> Assets</h3>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Logo URL</label>
                <Input value={settings.logo_url} onChange={(e) => handleChange("logo_url", e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Favicon URL</label>
                <Input value={settings.favicon_url} onChange={(e) => handleChange("favicon_url", e.target.value)} placeholder="https://..." />
              </div>
            </Card>
          </div>
        )}

        {/* Communication */}
        {activeTab === "communication" && (
          <Card className="p-5 space-y-4 max-w-xl">
            <h3 className="font-semibold text-white flex items-center gap-2"><Mail className="w-4 h-4 text-amber-400" /> SMTP Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">SMTP Host</label>
                <Input value={settings.smtp_host} onChange={(e) => handleChange("smtp_host", e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">SMTP Port</label>
                <Input value={settings.smtp_port} onChange={(e) => handleChange("smtp_port", e.target.value)} placeholder="587" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">SMTP Username</label>
              <Input value={settings.smtp_user} onChange={(e) => handleChange("smtp_user", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">From Address</label>
              <Input type="email" value={settings.smtp_from} onChange={(e) => handleChange("smtp_from", e.target.value)} placeholder="noreply@school.ac.ke" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input type="checkbox" id="email-notif" checked={settings.enable_email_notifications} onChange={(e) => handleChange("enable_email_notifications", e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-amber-400" />
              <label htmlFor="email-notif" className="text-sm text-gray-300">Enable Email Notifications</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="sms-notif" checked={settings.enable_sms_notifications} onChange={(e) => handleChange("enable_sms_notifications", e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-amber-400" />
              <label htmlFor="sms-notif" className="text-sm text-gray-300">Enable SMS Notifications</label>
            </div>
          </Card>
        )}

        {/* Security */}
        {activeTab === "security" && (
          <Card className="p-5 space-y-4 max-w-xl">
            <h3 className="font-semibold text-white flex items-center gap-2"><Shield className="w-4 h-4 text-amber-400" /> Security Settings</h3>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="parent-portal" checked={settings.enable_parent_portal} onChange={(e) => handleChange("enable_parent_portal", e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-amber-400" />
              <label htmlFor="parent-portal" className="text-sm text-gray-300">Enable Parent Portal</label>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Backup Frequency</label>
              <select value={settings.backup_frequency} onChange={(e) => handleChange("backup_frequency", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </Card>
        )}

        {/* Features */}
        {activeTab === "features" && (
          <Card className="p-5 space-y-4 max-w-xl">
            <h3 className="font-semibold text-white flex items-center gap-2"><Bell className="w-4 h-4 text-amber-400" /> Module Toggles</h3>
            <div className="space-y-3">
              {[
                { key: "enable_vora", label: "VORA Learning Videos" },
                { key: "enable_library", label: "Digital Library" },
                { key: "enable_parent_portal", label: "Parent Portal" },
                { key: "enable_email_notifications", label: "Email Notifications" },
                { key: "enable_sms_notifications", label: "SMS Notifications" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                  <span className="text-sm text-gray-300">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => handleChange(item.key as keyof PlatformSettings, !(settings as any)[item.key])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      (settings as any)[item.key] ? "bg-emerald-500" : "bg-gray-600"
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      (settings as any)[item.key] ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save All Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
