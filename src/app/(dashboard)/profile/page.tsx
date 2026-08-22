"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
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
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          bio: profileForm.bio,
          address: profileForm.address,
          emergency_contact: profileForm.emergency_contact,
          emergency_phone: profileForm.emergency_phone,
        }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
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
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setAvatarUrl(data.url);
      await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: data.url }),
      });
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
    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: passwordForm.current,
          new_password: passwordForm.newPass,
        }),
      });
      if (!res.ok) throw new Error("Failed to change password");
      toast.success("Password changed successfully");
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_prefs: prefs }),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
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
            <div className="w-24 h-24 rounded-full overflow-hidden bg-bdja-primary/10 flex items-center justify-center border-2 border-gray-200">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" width={96} height={96} className="object-cover w-full h-full" />
              ) : (
                <User className="w-10 h-10 text-bdja-primary" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-bdja-primary rounded-full flex items-center justify-center text-white hover:bg-bdja-primary/90 transition-colors"
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 min-w-0">
            {editingProfile ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm resize-y" placeholder="Tell us about yourself..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <Input value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                    <Input value={profileForm.emergency_contact} onChange={(e) => setProfileForm({ ...profileForm, emergency_contact: e.target.value })} placeholder="Name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Phone</label>
                    <Input value={profileForm.emergency_phone} onChange={(e) => setProfileForm({ ...profileForm, emergency_phone: e.target.value })} placeholder="+254..." />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleProfileSave} disabled={savingProfile}>
                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save Profile
                  </Button>
                  <Button variant="outline" onClick={() => setEditingProfile(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-semibold">{user?.full_name}</h2>
                  <Badge variant={user?.user_category === "admin" ? "destructive" : "default"} className="capitalize">
                    {user?.user_category}
                  </Badge>
                </div>
                <p className="text-gray-500">{user?.email}</p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-gray-500">Department:</span> <span className="font-medium">{dept || "—"}</span></div>
                  <div><span className="text-gray-500">Designation:</span> <span className="font-medium">{desig || "—"}</span></div>
                  <div><span className="text-gray-500">Grade Level:</span> <span className="font-medium capitalize">{grade || "—"}</span></div>
                  <div><span className="text-gray-500">Admission No:</span> <span className="font-medium">{admNo || "—"}</span></div>
                  <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{profileForm.phone || "—"}</span></div>
                  <div><span className="text-gray-500">Address:</span> <span className="font-medium">{profileForm.address || "—"}</span></div>
                </div>
                {profileForm.bio && <p className="mt-3 text-sm text-gray-600 italic">"{profileForm.bio}"</p>}
                <Button onClick={() => setEditingProfile(true)} className="mt-4" size="sm" variant="outline">
                  <Pencil className="w-3 h-3 mr-1" /> Edit Profile
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Password Change */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Lock className="w-5 h-5 text-bdja-primary" /> Change Password</h3>
        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input type="password" placeholder="Current Password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} required />
          <Input type="password" placeholder="New Password" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} required />
          <Input type="password" placeholder="Confirm New Password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} required />
          <div className="md:col-span-3">
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Lock className="w-4 h-4 mr-1" />}
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><Bell className="w-5 h-5 text-bdja-primary" /> Notification Preferences</h3>
        <div className="space-y-3">
          {[
            { key: "email_notifications", label: "Email Notifications", icon: Mail },
            { key: "sms_notifications", label: "SMS Notifications", icon: Phone },
            { key: "assignment_reminders", label: "Assignment Reminders", icon: Activity },
            { key: "fee_reminders", label: "Fee Reminders", icon: Shield },
            { key: "event_reminders", label: "Event Reminders", icon: Bell },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <button
                type="button"
                onClick={() => setPrefs((prev) => ({ ...prev, [item.key]: !prev[item.key as keyof NotificationPrefs] }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs[item.key as keyof NotificationPrefs] ? "bg-emerald-500" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs[item.key as keyof NotificationPrefs] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>
        <Button onClick={handleSavePrefs} disabled={savingPrefs} className="mt-4" size="sm">
          {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          Save Preferences
        </Button>
      </Card>

      {/* Suggestions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-bdja-primary" />
            <h2 className="text-lg font-semibold">My Suggestions & Feedback</h2>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            {showForm ? "Cancel" : "Submit New"}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSuggestionSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="idea">Idea</option>
                  <option value="feedback">Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="improvement">Improvement</option>
                  <option value="complaint">Complaint</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Short summary..." required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg text-sm resize-y" placeholder="Describe your suggestion in detail..." required />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting} className="bg-bdja-primary hover:bg-bdja-primary/90">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                Submit Suggestion
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {suggestions.length === 0 && <p className="text-gray-500 text-sm">No suggestions submitted yet.</p>}
          {suggestions.map((s) => (
            <div key={s.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                {getTypeIcon(s.type)}
                <span className="font-medium text-sm">{s.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(s.status)}`}>{s.status.replace("_", " ")}</span>
              </div>
              <p className="text-sm text-gray-600">{s.description}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(s.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
