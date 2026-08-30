"use client";

import { useState, useEffect, useCallback, useRef, FormEvent, ChangeEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost } from "@/lib/api-client";
import { compressImage, formatFileSize } from "@/lib/image-utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  User, Camera, Mail, Phone, MapPin, Shield, Bell, Lock, Pencil,
  MessageSquare, Send, Lightbulb, Bug, ThumbsUp, Loader2, Save, X,
  Check, AlertCircle, ImageIcon, ChevronRight, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ─── */
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

type TabKey = "profile" | "security" | "notifications" | "feedback";

/* ─── Helpers ─── */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getRoleColor(role: string): string {
  switch (role) {
    case "admin": return "bg-purple-100 text-purple-800";
    case "staff": return "bg-blue-100 text-blue-800";
    case "student": return "bg-green-100 text-green-800";
    case "parent": return "bg-orange-100 text-orange-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

/* ─── Component ─── */
export default function ProfilePage() {
  const { user, refresh } = useAuth();

  /* Tabs */
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  /* Profile data */
  const [related, setRelated] = useState<RelatedData | null>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    bio: "",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  /* Avatar */
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Password */
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  /* Notifications */
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email_notifications: true,
    sms_notifications: false,
    assignment_reminders: true,
    fee_reminders: true,
    event_reminders: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  /* Suggestions */
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestionForm, setSuggestionForm] = useState({
    type: "feedback",
    title: "",
    description: "",
    priority: "medium",
  });
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  /* ─── Load data ─── */
  const fetchRelated = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiGet<RelatedData>(
        `/api/profile/related?id=${user.id}&category=${user.user_category}`
      );
      setRelated(data);
      setProfileForm({
        full_name: user.full_name || "",
        phone: user.email || "",
        bio: data.bio || "",
        address: data.address || "",
        emergency_contact: data.emergency_contact || "",
        emergency_phone: data.emergency_phone || "",
      });
    } catch {
      // silently fail — non-critical
    }
  }, [user]);

  const fetchSuggestions = useCallback(async () => {
    try {
      const data = await apiGet<{ suggestions: Suggestion[] }>("/api/suggestions");
      setSuggestions(data.suggestions || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (user) {
      setAvatarUrl(user.avatar_url || "");
      fetchRelated();
      fetchSuggestions();
    }
  }, [user, fetchRelated, fetchSuggestions]);

  /* ─── Profile save ─── */
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update profile");
      }
      toast.success("Profile updated successfully");
      setEditingProfile(false);
      refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  /* ─── Avatar: file selected → show preview ─── */
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large. Max 10MB.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setPreviewFile(file);
  };

  /* ─── Avatar: confirm upload ─── */
  const handleConfirmUpload = async () => {
    if (!previewFile || !user) return;

    setUploadingAvatar(true);
    setUploadProgress(10);

    try {
      // Step 1: Compress client-side
      setUploadProgress(30);
      const compressed = await compressImage(previewFile, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.85,
        format: "image/webp",
      });
      setUploadProgress(50);

      // Step 2: Build FormData
      const formData = new FormData();
      formData.append("file", compressed, "avatar.webp");
      formData.append("updateProfile", "true");

      // Step 3: Upload — cookies authenticate automatically
      setUploadProgress(70);
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      setUploadProgress(90);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      setAvatarUrl(data.url);
      setUploadProgress(100);
      toast.success("Avatar updated");
      refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
      setUploadProgress(0);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPreviewFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ─── Password change ─── */
  const handlePasswordChange = async (e: FormEvent) => {
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

  /* ─── Notification prefs ─── */
  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
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

  /* ─── Suggestions ─── */
  const handleSuggestionSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!suggestionForm.title.trim() || !suggestionForm.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSubmittingSuggestion(true);
    try {
      await apiPost("/api/suggestions", {
        title: suggestionForm.title.trim(),
        description: suggestionForm.description.trim(),
        type: suggestionForm.type,
        priority: suggestionForm.priority,
      });
      toast.success("Suggestion submitted!");
      setSuggestionForm({ type: "feedback", title: "", description: "", priority: "medium" });
      setShowSuggestionForm(false);
      fetchSuggestions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  /* ─── Render helpers ─── */
  const dept = related?.department || user?.department;
  const desig = related?.designation || user?.designation;
  const grade = related?.grade_level || user?.grade_level;
  const admNo = related?.admission_number || user?.admission_number;
  const initials = getInitials(user?.full_name || "U");

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    { key: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
    { key: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { key: "feedback", label: "Feedback", icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* ─── Cover Header ─── */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-20 relative z-10">
        {/* ─── Avatar + Name Card ─── */}
        <Card className="p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white p-1 shadow-lg">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center relative">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={user?.full_name || "Avatar"}
                      fill
                      className="object-cover"
                      sizes="144px"
                    />
                  ) : (
                    <span className="text-3xl sm:text-4xl font-bold text-gray-400">
                      {initials}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-1 right-1 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                title="Change photo"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {user?.full_name || "User"}
              </h1>
              <p className="text-gray-500 mt-1">{user?.email}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                <Badge className={getRoleColor(user?.role || "")}>{user?.role}</Badge>
                <Badge variant="secondary">{user?.user_category}</Badge>
                {dept && <Badge variant="default">{dept}</Badge>}
                {desig && <Badge variant="default">{desig}</Badge>}
                {grade && <Badge variant="default">Grade {grade}</Badge>}
                {admNo && <Badge variant="default">#{admNo}</Badge>}
              </div>
            </div>

            {/* Quick stats */}
            <div className="hidden md:flex gap-6 text-center">
              <div>
                <div className="text-xl font-bold text-gray-900">{user?.role === "student" ? grade || "—" : desig || "—"}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">{user?.role === "student" ? "Grade" : "Designation"}</div>
              </div>
              <div className="w-px bg-gray-200" />
              <div>
                <div className="text-xl font-bold text-gray-900">{dept || "—"}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Department</div>
              </div>
            </div>
          </div>

          {/* Upload progress */}
          {uploadingAvatar && uploadProgress > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* ─── Preview Modal ─── */}
        <AnimatePresence>
          {previewUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mb-6"
            >
              <Card className="p-6 border-2 border-blue-200 bg-blue-50/50">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold text-gray-900">Preview new avatar</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {previewFile ? formatFileSize(previewFile.size) : ""} → compressed before upload
                    </p>
                    <div className="flex gap-3 mt-4 justify-center sm:justify-start">
                      <Button
                        onClick={handleConfirmUpload}
                        disabled={uploadingAvatar}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Check className="w-4 h-4 mr-1" />
                        )}
                        {uploadingAvatar ? "Uploading..." : "Save Avatar"}
                      </Button>
                      <Button variant="outline" onClick={handleCancelPreview} disabled={uploadingAvatar}>
                        <X className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Tabs ─── */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ─── */}
        <AnimatePresence mode="wait">
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Profile Info Card */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                    <p className="text-sm text-gray-500">Update your personal details</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (editingProfile) {
                        // cancel — revert
                        setEditingProfile(false);
                        if (user) {
                          setProfileForm({
                            full_name: user.full_name || "",
                            phone: user.email || "",
                            bio: related?.bio || "",
                            address: related?.address || "",
                            emergency_contact: related?.emergency_contact || "",
                            emergency_phone: related?.emergency_phone || "",
                          });
                        }
                      } else {
                        setEditingProfile(true);
                      }
                    }}
                  >
                    {editingProfile ? (
                      <>
                        <X className="w-4 h-4 mr-1" /> Cancel
                      </>
                    ) : (
                      <>
                        <Pencil className="w-4 h-4 mr-1" /> Edit
                      </>
                    )}
                  </Button>
                </div>

                {editingProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                      <Input
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                      <Input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                      <Input
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        placeholder="Short bio about yourself"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                      <Input
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                        placeholder="Your address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Emergency Contact</label>
                      <Input
                        value={profileForm.emergency_contact}
                        onChange={(e) => setProfileForm({ ...profileForm, emergency_contact: e.target.value })}
                        placeholder="Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Emergency Phone</label>
                      <Input
                        value={profileForm.emergency_phone}
                        onChange={(e) => setProfileForm({ ...profileForm, emergency_phone: e.target.value })}
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button onClick={handleProfileSave} disabled={savingProfile}>
                        {savingProfile ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Save className="w-4 h-4 mr-1" />
                        )}
                        {savingProfile ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
                    <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={user?.email} />
                    <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={profileForm.phone || "Not set"} />
                    <InfoRow icon={<MapPin className="w-4 h-4" />} label="Address" value={profileForm.address || "Not set"} className="md:col-span-2" />
                    <InfoRow icon={<Shield className="w-4 h-4" />} label="Emergency Contact" value={profileForm.emergency_contact || "Not set"} />
                    <InfoRow icon={<Phone className="w-4 h-4" />} label="Emergency Phone" value={profileForm.emergency_phone || "Not set"} />
                    <InfoRow icon={<User className="w-4 h-4" />} label="Bio" value={profileForm.bio || "No bio added yet"} className="md:col-span-2" />
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div
              key="security"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-6 max-w-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Change Password</h3>
                <p className="text-sm text-gray-500 mb-6">Update your password to keep your account secure</p>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="relative">
                    <Input
                      type={showCurrent ? "text" : "password"}
                      placeholder="Current password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      placeholder="New password (min 8 chars)"
                      value={passwordForm.newPass}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  />
                  <Button type="submit" disabled={changingPassword}>
                    {changingPassword ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Lock className="w-4 h-4 mr-1" />
                    )}
                    {changingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </Card>
            </motion.div>
          )}

          {activeTab === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-6 max-w-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Notification Preferences</h3>
                <p className="text-sm text-gray-500 mb-6">Choose how you want to be notified</p>

                <div className="space-y-4">
                  {([
                    { key: "email_notifications" as const, label: "Email Notifications", desc: "Receive updates via email" },
                    { key: "sms_notifications" as const, label: "SMS Notifications", desc: "Receive updates via text message" },
                    { key: "assignment_reminders" as const, label: "Assignment Reminders", desc: "Get reminded about upcoming assignments" },
                    { key: "fee_reminders" as const, label: "Fee Reminders", desc: "Get reminded about fee payments" },
                    { key: "event_reminders" as const, label: "Event Reminders", desc: "Get reminded about school events" },
                  ]).map((item) => (
                    <label
                      key={item.key}
                      className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={prefs[item.key]}
                        onChange={(e) => setPrefs({ ...prefs, [item.key]: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded mt-0.5 shrink-0"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{item.label}</div>
                        <div className="text-sm text-gray-500">{item.desc}</div>
                      </div>
                    </label>
                  ))}
                  <Button onClick={handleSavePrefs} disabled={savingPrefs} className="mt-2">
                    {savingPrefs ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    {savingPrefs ? "Saving..." : "Save Preferences"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === "feedback" && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Suggestions & Feedback</h3>
                    <p className="text-sm text-gray-500">Help us improve BDJA</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSuggestionForm(!showSuggestionForm)}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {showSuggestionForm ? "Cancel" : "New Suggestion"}
                  </Button>
                </div>

                <AnimatePresence>
                  {showSuggestionForm && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onSubmit={handleSuggestionSubmit}
                      className="space-y-4 mb-6 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <select
                          value={suggestionForm.type}
                          onChange={(e) => setSuggestionForm({ ...suggestionForm, type: e.target.value })}
                          className="border rounded-lg px-3 py-2.5 text-sm bg-white"
                        >
                          <option value="feedback">Feedback</option>
                          <option value="bug">Bug Report</option>
                          <option value="idea">Idea</option>
                          <option value="improvement">Improvement</option>
                        </select>
                        <select
                          value={suggestionForm.priority}
                          onChange={(e) => setSuggestionForm({ ...suggestionForm, priority: e.target.value })}
                          className="border rounded-lg px-3 py-2.5 text-sm bg-white"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                      </div>
                      <Input
                        placeholder="Title"
                        value={suggestionForm.title}
                        onChange={(e) => setSuggestionForm({ ...suggestionForm, title: e.target.value })}
                      />
                      <textarea
                        placeholder="Describe your suggestion..."
                        value={suggestionForm.description}
                        onChange={(e) => setSuggestionForm({ ...suggestionForm, description: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2.5 text-sm min-h-[120px] resize-y"
                      />
                      <Button type="submit" disabled={submittingSuggestion}>
                        {submittingSuggestion ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Send className="w-4 h-4 mr-1" />
                        )}
                        {submittingSuggestion ? "Submitting..." : "Submit"}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  {suggestions.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No suggestions yet. Be the first!</p>
                    </div>
                  ) : (
                    suggestions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                      >
                        {s.type === "bug" ? (
                          <Bug className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        ) : s.type === "idea" ? (
                          <Lightbulb className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                        ) : s.type === "improvement" ? (
                          <ThumbsUp className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <MessageSquare className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-gray-900">{s.title}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                s.status === "implemented"
                                  ? "bg-green-100 text-green-700"
                                  : s.status === "under_review"
                                  ? "bg-blue-100 text-blue-700"
                                  : s.status === "declined"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {s.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{s.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── InfoRow sub-component ─── */
function InfoRow({
  icon,
  label,
  value,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | undefined | null;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="text-sm text-gray-900 font-medium">{value || "—"}</div>
      </div>
    </div>
  );
}
