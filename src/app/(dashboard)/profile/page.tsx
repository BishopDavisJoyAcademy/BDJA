"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  User, Camera, Mail, Phone, MapPin, Shield, Bell, Moon, Sun, Pencil,
  MessageSquare, Send, Lightbulb, Bug, ThumbsUp, Loader2, Save, Lock, Activity
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import Image from "next/image";

interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
}

interface RelatedData {
  department: string | null;
  designation: string | null;
  grade_level: string | null;
  admission_number: string | null;
  bio: string | null;
  address: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
}

interface NotificationPrefs {
  email_notifications: boolean;
  sms_notifications: boolean;
  assignment_reminders: boolean;
  fee_reminders: boolean;
  event_reminders: boolean;
}

async function resolveAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: { session: refreshed } } = await supabase.auth.getSession();
    return refreshed?.access_token || null;
  }
  return null;
}

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "feedback", title: "", description: "", priority: "medium" });
  const [submitting, setSubmitting] = useState(false);
  const [related, setRelated] = useState<RelatedData | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", bio: "", address: "", emergency_contact: "", emergency_phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email_notifications: true,
    sms_notifications: false,
    assignment_reminders: true,
    fee_reminders: true,
    event_reminders: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRelatedData = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiGet<RelatedData>(`/api/profile/related?id=${user.id}&category=${user.user_category}`);
      setRelated(data);
      setProfileForm({
        full_name: user.full_name || "",
        phone: user.email || "",
        bio: data.bio || "",
        address: data.address || "",
        emergency_contact: data.emergency_contact || "",
        emergency_phone: data.emergency_phone || "",
      });
    } catch (err: unknown) {
      console.error("Failed to fetch related data:", err);
    }
  }, [user]);

  const fetchSuggestions = useCallback(async () => {
    try {
      const data = await apiGet<{ suggestions: Suggestion[] }>("/api/suggestions");
      setSuggestions(data.suggestions || []);
    } catch (err: unknown) {
      console.error("Failed to fetch suggestions:", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSuggestions();
      fetchRelatedData();
      setAvatarUrl(user.avatar_url || "");
    }
  }, [user, fetchSuggestions, fetchRelatedData]);

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/suggestions", {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        priority: form.priority,
      });
      toast.success("Suggestion submitted successfully!");
      setForm({ type: "feedback", title: "", description: "", priority: "medium" });
      setShowForm(false);
      fetchSuggestions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSave = async () => {
    if (!user) return;
    const token = await resolveAuthToken();
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          bio: profileForm.bio,
          address: profileForm.address,
          emergency_contact: profileForm.emergency_contact,
          emergency_phone: profileForm.emergency_phone,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update profile");
      }
      toast.success("Profile updated");
      setEditingProfile(false);
      refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const token = await resolveAuthToken();
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      setAvatarUrl(data.url);

      // Save avatar URL to profile
      const patchRes = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar_url: data.url }),
      });

      if (!patchRes.ok) {
        const patchData = await patchRes.json().catch(() => ({}));
        throw new Error(patchData.error || "Failed to save avatar");
      }

      toast.success("Avatar updated");
      refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwordForm.newPass.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    const token = await resolveAuthToken();
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          current_password: passwordForm.current,
          new_password: passwordForm.newPass,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to change password");
      }
      toast.success("Password changed successfully");
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSavePrefs = async () => {
    const token = await resolveAuthToken();
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ notification_prefs: prefs }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save preferences");
      }
      toast.success("Preferences saved");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingPrefs(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug": return <Bug className="w-4 h-4 text-red-500" />;
      case "idea": return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case "improvement": return <ThumbsUp className="w-4 h-4 text-green-500" />;
      default: return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
      planned: "bg-purple-100 text-purple-800",
      implemented: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
      closed: "bg-gray-100 text-gray-800",
    };
    return colors[status] || colors.open;
  };

  const dept = related?.department || user?.department;
  const desig = related?.designation || user?.designation;
  const grade = related?.grade_level || user?.grade_level;
  const admNo = related?.admission_number || user?.admission_number;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500">View and manage your profile information</p>
      </div>

      {/* Profile Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" width={96} height={96} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 disabled:opacity-50"
            >
              {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{user?.full_name || "User"}</h2>
            <p className="text-gray-500">{user?.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary">{user?.role}</Badge>
              <Badge variant="outline">{user?.user_category}</Badge>
              {dept && <Badge variant="outline">{dept}</Badge>}
              {desig && <Badge variant="outline">{desig}</Badge>}
              {grade && <Badge variant="outline">Grade {grade}</Badge>}
              {admNo && <Badge variant="outline">#{admNo}</Badge>}
            </div>
          </div>
        </div>
      </Card>

      {/* Profile Details */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5" /> Profile Details
          </h3>
          <Button variant="outline" size="sm" onClick={() => setEditingProfile(!editingProfile)}>
            <Pencil className="w-4 h-4 mr-1" /> {editingProfile ? "Cancel" : "Edit"}
          </Button>
        </div>
        {editingProfile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Bio</label>
                <Input value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <Input value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Emergency Contact</label>
                <Input value={profileForm.emergency_contact} onChange={(e) => setProfileForm({ ...profileForm, emergency_contact: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Emergency Phone</label>
                <Input value={profileForm.emergency_phone} onChange={(e) => setProfileForm({ ...profileForm, emergency_phone: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleProfileSave} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{profileForm.phone || "Not set"}</span>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{profileForm.address || "Not set"}</span>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{profileForm.bio || "No bio"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Emergency: {profileForm.emergency_contact || "Not set"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{profileForm.emergency_phone || "Not set"}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Password Change */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5" /> Change Password
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <Input type="password" placeholder="Current password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} />
          <Input type="password" placeholder="New password" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} />
          <Input type="password" placeholder="Confirm new password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
          <Button type="submit" disabled={changingPassword}>
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Change Password
          </Button>
        </form>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5" /> Notification Preferences
        </h3>
        <div className="space-y-3">
          {[
            { key: "email_notifications" as const, label: "Email Notifications" },
            { key: "sms_notifications" as const, label: "SMS Notifications" },
            { key: "assignment_reminders" as const, label: "Assignment Reminders" },
            { key: "fee_reminders" as const, label: "Fee Reminders" },
            { key: "event_reminders" as const, label: "Event Reminders" },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs[item.key]}
                onChange={(e) => setPrefs({ ...prefs, [item.key]: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
          <Button onClick={handleSavePrefs} disabled={savingPrefs} className="mt-2">
            {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save Preferences
          </Button>
        </div>
      </Card>

      {/* Suggestions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Suggestions & Feedback
          </h3>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            <Send className="w-4 h-4 mr-1" /> {showForm ? "Cancel" : "New"}
          </Button>
        </div>
        {showForm && (
          <form onSubmit={handleSuggestionSubmit} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border rounded-md px-3 py-2 text-sm">
                <option value="feedback">Feedback</option>
                <option value="bug">Bug Report</option>
                <option value="idea">Idea</option>
                <option value="improvement">Improvement</option>
              </select>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="border rounded-md px-3 py-2 text-sm">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm min-h-[100px]"
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />} Submit
            </Button>
          </form>
        )}
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-gray-500 text-sm">No suggestions yet.</p>
          ) : (
            suggestions.map((s) => (
              <div key={s.id} className="border rounded-lg p-3 flex items-start gap-3">
                {getTypeIcon(s.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{s.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(s.status)}`}>{s.status.replace("_", " ")}</span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{s.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
