"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Settings, Bell, Shield, Moon, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    email_notifications: true,
    sms_notifications: false,
    dark_mode: false,
    two_factor: false,
    language: "en",
  });

  async function handleSave() {
    setSaving(true);
    // Simulate save — in production this would call /api/joy/preferences or similar
    setTimeout(() => setSaving(false), 800);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <p className="text-xs text-gray-500">Control how you receive alerts</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50">
              <span className="text-sm text-gray-700">Email Notifications</span>
              <input type="checkbox" checked={prefs.email_notifications} onChange={(e) => setPrefs({ ...prefs, email_notifications: e.target.checked })} className="w-4 h-4 text-blue-600" />
            </label>
            <label className="flex items-center justify-between p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50">
              <span className="text-sm text-gray-700">SMS Notifications</span>
              <input type="checkbox" checked={prefs.sms_notifications} onChange={(e) => setPrefs({ ...prefs, sms_notifications: e.target.checked })} className="w-4 h-4 text-blue-600" />
            </label>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Security</h3>
              <p className="text-xs text-gray-500">Protect your account</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50">
              <span className="text-sm text-gray-700">Two-Factor Authentication</span>
              <input type="checkbox" checked={prefs.two_factor} onChange={(e) => setPrefs({ ...prefs, two_factor: e.target.checked })} className="w-4 h-4 text-blue-600" />
            </label>
            <button className="w-full text-left p-3 border border-gray-100 rounded-lg hover:bg-gray-50 text-sm text-blue-600">Change Password</button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <Moon className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Appearance</h3>
              <p className="text-xs text-gray-500">Customize your experience</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50">
              <span className="text-sm text-gray-700">Dark Mode</span>
              <input type="checkbox" checked={prefs.dark_mode} onChange={(e) => setPrefs({ ...prefs, dark_mode: e.target.checked })} className="w-4 h-4 text-blue-600" />
            </label>
            <div className="p-3 border border-gray-100 rounded-lg">
              <span className="text-sm text-gray-700">Language</span>
              <select value={prefs.language} onChange={(e) => setPrefs({ ...prefs, language: e.target.value })} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="en">English</option>
                <option value="sw">Kiswahili</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Settings className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Account</h3>
              <p className="text-xs text-gray-500">Manage account details</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 border border-gray-100 rounded-lg">
              <p className="text-xs text-gray-500">Name</p>
              <p className="text-sm font-medium text-gray-900">{user?.fullName || "—"}</p>
            </div>
            <div className="p-3 border border-gray-100 rounded-lg">
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{user?.email || "—"}</p>
            </div>
            <div className="p-3 border border-gray-100 rounded-lg">
              <p className="text-xs text-gray-500">Role</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{user?.userCategory || "—"}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
