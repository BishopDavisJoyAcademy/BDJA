"use client";

import { useState, useEffect, useCallback, useRef, FormEvent, ChangeEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiGet } from "@/lib/api-client";
import { compressImage, formatFileSize } from "@/lib/image-utils";
import { requestSignedUploadUrl, uploadFileToSignedUrl } from "@/lib/upload-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  User, Camera, Mail, Phone, Shield, Lock, Pencil,
  MessageSquare, Send, Lightbulb, Bug, ThumbsUp, Loader2, Save, X,
  Check, AlertCircle, Eye, EyeOff, Upload, GraduationCap, Building2
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
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
}

interface RelatedData {
  department: string | null;
  designation: string | null;
  grade_level: string | null;
  admission_number: string | null;
}

type TabKey = "profile" | "security" | "feedback";
type UploadPhase = "idle" | "preview" | "compressing" | "signing" | "uploading" | "saving" | "done" | "error";

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

function getStatusBadge(status: string): string {
  const map: Record<string, string> = {
    open: "bg-amber-100 text-amber-800 border-amber-200",
    under_review: "bg-blue-100 text-blue-800 border-blue-200",
    planned: "bg-violet-100 text-violet-800 border-violet-200",
    implemented: "bg-emerald-100 text-emerald-800 border-emerald-200",
    declined: "bg-red-100 text-red-800 border-red-200",
    closed: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return map[status] || map.open;
}

/* ─── Component ─── */
export default function ProfilePage() {
  const { user, refresh } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [related, setRelated] = useState<RelatedData | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const hasInitialized = useRef(false);

  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestionForm, setSuggestionForm] = useState({ type: "feedback", title: "", description: "", priority: "medium" });
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  /* ─── Initialize once ─── */
  useEffect(() => {
    if (user && !hasInitialized.current) {
      hasInitialized.current = true;
      setAvatarUrl(user.avatar_url || "");
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  /* ─── Fetch related data ─── */
  const fetchRelated = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiGet<RelatedData>(
        `/api/profile/related?id=${user.id}&category=${user.user_category}`
      );
      setRelated(data);
    } catch {
      // non-critical
    }
  }, [user, user?.id, user?.user_category]);

  /* ─── Fetch suggestions ─── */
  const fetchSuggestions = useCallback(async () => {
    try {
      const data = await apiGet<{ suggestions: Suggestion[] }>("/api/suggestions");
      setSuggestions(data.suggestions || []);
    } catch {
      // non-critical
    }
  }, []);

  /* ─── Load data once on mount ─── */
  useEffect(() => {
    if (user && hasInitialized.current) {
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
        body: JSON.stringify({ full_name: fullName, phone: phone || null }),
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

  const handleCancelEdit = () => {
    setEditingProfile(false);
    if (user) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
    }
  };

  /* ─── Avatar: select file → preview ─── */
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Max 10MB");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewFile(file);
    setUploadPhase("preview");
    setUploadError(null);
  };

  /* ─── Avatar: confirm upload ─── */
  const handleConfirmUpload = async () => {
    if (!previewFile || !previewUrl) return;
    setUploadPhase("compressing");
    setUploadProgress(0);
    setUploadError(null);

    try {
      const compressed = await compressImage(previewFile, {
        maxWidth: 800, maxHeight: 800, quality: 0.85, format: "image/webp",
      });

      setUploadPhase("signing");
      const signed = await requestSignedUploadUrl(previewFile.name, "image/webp");

      setUploadPhase("uploading");
      await uploadFileToSignedUrl(signed.signedUrl, compressed, "image/webp", {
        onProgress: (e) => setUploadProgress(e.percentage),
      });

      setUploadPhase("saving");
      const patchRes = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: signed.publicUrl }),
      });
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save avatar");
      }

      setAvatarUrl(signed.publicUrl);
      setUploadPhase("done");
      toast.success("Avatar updated");
      refresh();
      setTimeout(() => {
        setUploadPhase("idle");
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPreviewFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 2000);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setUploadError(msg);
      setUploadPhase("error");
      toast.error(msg);
    }
  };

  const handleCancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
    setUploadPhase("idle");
    setUploadError(null);
    setUploadProgress(0);
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
      toast.error("Min 8 characters");
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
        throw new Error(data.error || "Failed");
      }
      toast.success("Password changed");
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  /* ─── Suggestions ─── */
  const handleSuggestionSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!suggestionForm.title.trim() || !suggestionForm.description.trim()) {
      toast.error("Title and description required");
      return;
    }
    setSubmittingSuggestion(true);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestionForm.title.trim(),
          description: suggestionForm.description.trim(),
          type: suggestionForm.type,
          priority: suggestionForm.priority,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }
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

  /* ─── Render ─── */
  const initials = getInitials(user?.full_name || "U");
  const isUploading = uploadPhase === "compressing" || uploadPhase === "signing" || uploadPhase === "uploading" || uploadPhase === "saving";

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    { key: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
    { key: "feedback", label: "My Feedback", icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* ─── Cover ─── */}
      <div className="relative h-52 sm:h-64 bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700">
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-24 relative z-10">
        {/* ─── Profile Card ─── */}
        <Card className="p-6 sm:p-8 mb-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white p-1.5 shadow-xl ring-4 ring-white/50">
                <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar" fill className="object-cover" sizes="144px" />
                  ) : (
                    <span className="text-4xl sm:text-5xl font-bold text-gray-300">{initials}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-1 right-1 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                title="Change photo"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1 pt-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{user?.full_name || "User"}</h1>
              <p className="text-gray-500 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {user?.email}
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                <Badge className={getRoleColor(user?.role || "")}>{user?.role}</Badge>
                <Badge variant="secondary">{user?.user_category}</Badge>
                {related?.department && <Badge variant="default"><Building2 className="w-3 h-3 mr-1" />{related.department}</Badge>}
                {related?.designation && <Badge variant="default">{related.designation}</Badge>}
                {related?.grade_level && <Badge variant="default"><GraduationCap className="w-3 h-3 mr-1" />Grade {related.grade_level}</Badge>}
                {related?.admission_number && <Badge variant="default">#{related.admission_number}</Badge>}
              </div>
            </div>

            {/* Stats */}
            <div className="hidden md:flex gap-8 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{user?.role === "student" ? related?.grade_level || "—" : related?.designation || "—"}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mt-0.5">{user?.role === "student" ? "Grade" : "Role"}</div>
              </div>
              <div className="w-px bg-gray-200" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{related?.department || user?.user_category || "—"}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mt-0.5">Department</div>
              </div>
            </div>
          </div>
        </Card>

        {/* ─── Upload States ─── */}
        <AnimatePresence mode="wait">
          {uploadPhase === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="mb-6">
              <Card className="p-6 border-2 border-blue-200 bg-blue-50/40">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg shrink-0 relative">
                    {previewUrl && <Image src={previewUrl} alt="Preview" fill className="object-cover" unoptimized sizes="112px" />}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold text-gray-900 text-lg">Preview</h3>
                    <p className="text-sm text-gray-500 mt-1">{previewFile ? `${formatFileSize(previewFile.size)} → compressed to WebP` : ""}</p>
                    <div className="flex gap-3 mt-4 justify-center sm:justify-start">
                      <Button onClick={handleConfirmUpload} className="bg-blue-600 hover:bg-blue-700"><Upload className="w-4 h-4 mr-1.5" /> Save Avatar</Button>
                      <Button variant="outline" onClick={handleCancelPreview}><X className="w-4 h-4 mr-1.5" /> Cancel</Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {isUploading && (
            <motion.div key="uploading" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="mb-6">
              <Card className="p-6 border-2 border-blue-200 bg-blue-50/40">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-gray-900">
                        {uploadPhase === "compressing" && "Compressing..."}
                        {uploadPhase === "signing" && "Preparing upload..."}
                        {uploadPhase === "uploading" && `Uploading ${uploadProgress}%`}
                        {uploadPhase === "saving" && "Saving..."}
                      </span>
                      <span className="text-sm text-gray-500 font-medium">{uploadPhase === "uploading" ? `${uploadProgress}%` : "..."}</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-blue-600 rounded-full" initial={{ width: 0 }} animate={{ width: `${uploadPhase === "uploading" ? uploadProgress : uploadPhase === "saving" ? 95 : uploadPhase === "signing" ? 40 : 20}%` }} transition={{ duration: 0.3 }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      {uploadPhase === "compressing" && "Optimizing image in browser..."}
                      {uploadPhase === "signing" && "Getting secure upload URL..."}
                      {uploadPhase === "uploading" && `Sent ${formatFileSize(Math.round((uploadProgress / 100) * (previewFile?.size || 0)))}`}
                      {uploadPhase === "saving" && "Updating your profile..."}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {uploadPhase === "error" && (
            <motion.div key="error" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="mb-6">
              <Card className="p-6 border-2 border-red-200 bg-red-50/40">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <div>
                    <p className="font-semibold">Upload failed</p>
                    <p className="text-sm text-red-600">{uploadError}</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button onClick={() => { setUploadPhase("preview"); setUploadError(null); }} variant="outline">Try Again</Button>
                  <Button onClick={handleCancelPreview} variant="ghost">Cancel</Button>
                </div>
              </Card>
            </motion.div>
          )}

          {uploadPhase === "done" && (
            <motion.div key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="mb-6">
              <Card className="p-6 border-2 border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center gap-3 text-emerald-700">
                  <Check className="w-6 h-6 shrink-0" />
                  <span className="font-semibold">Avatar updated successfully!</span>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Tabs ─── */}
        <div className="flex gap-1 bg-white rounded-xl p-1.5 shadow-sm border mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.key ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
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
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
              <Card className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
                    <p className="text-sm text-gray-500">Manage your profile details</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => editingProfile ? handleCancelEdit() : setEditingProfile(true)}>
                    {editingProfile ? <><X className="w-4 h-4 mr-1.5" /> Cancel</> : <><Pencil className="w-4 h-4 mr-1.5" /> Edit</>}
                  </Button>
                </div>

                {editingProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
                    </div>
                    <div className="md:col-span-2">
                      <Button onClick={handleProfileSave} disabled={savingProfile}>
                        {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                        {savingProfile ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10">
                    <InfoRow icon={<User className="w-4 h-4" />} label="Full Name" value={user?.full_name} />
                    <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={user?.email} />
                    <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={user?.phone || "Not set"} />
                    <InfoRow icon={<Shield className="w-4 h-4" />} label="Role" value={user?.role} />
                    <InfoRow icon={<Building2 className="w-4 h-4" />} label="Department" value={related?.department || "—"} />
                    <InfoRow icon={<Shield className="w-4 h-4" />} label="Designation" value={related?.designation || "—"} />
                    {user?.user_category === "student" && (
                      <>
                        <InfoRow icon={<GraduationCap className="w-4 h-4" />} label="Grade Level" value={related?.grade_level || "—"} />
                        <InfoRow icon={<User className="w-4 h-4" />} label="Admission Number" value={related?.admission_number || "—"} />
                      </>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <Card className="p-6 sm:p-8 max-w-xl">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Change Password</h3>
                <p className="text-sm text-gray-500 mb-6">Keep your account secure with a strong password</p>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="relative">
                    <Input type={showCurrent ? "text" : "password"} placeholder="Current password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Input type={showNew ? "text" : "password"} placeholder="New password (min 8 characters)" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Input type="password" placeholder="Confirm new password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
                  <Button type="submit" disabled={changingPassword}>
                    {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Lock className="w-4 h-4 mr-1.5" />}
                    {changingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </Card>
            </motion.div>
          )}

          {activeTab === "feedback" && (
            <motion.div key="feedback" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
              <Card className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">My Feedback</h3>
                    <p className="text-sm text-gray-500">Share ideas, report bugs, or suggest improvements</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowSuggestionForm(!showSuggestionForm)}>
                    <Send className="w-4 h-4 mr-1.5" /> {showSuggestionForm ? "Cancel" : "New"}
                  </Button>
                </div>

                <AnimatePresence>
                  {showSuggestionForm && (
                    <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={handleSuggestionSubmit} className="space-y-4 mb-6 overflow-hidden">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <select value={suggestionForm.type} onChange={(e) => setSuggestionForm({ ...suggestionForm, type: e.target.value })} className="border rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                          <option value="feedback">Feedback</option>
                          <option value="bug">Bug Report</option>
                          <option value="idea">Idea</option>
                          <option value="improvement">Improvement</option>
                        </select>
                        <select value={suggestionForm.priority} onChange={(e) => setSuggestionForm({ ...suggestionForm, priority: e.target.value })} className="border rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                      </div>
                      <Input placeholder="Title" value={suggestionForm.title} onChange={(e) => setSuggestionForm({ ...suggestionForm, title: e.target.value })} />
                      <textarea placeholder="Describe your suggestion in detail..." value={suggestionForm.description} onChange={(e) => setSuggestionForm({ ...suggestionForm, description: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 text-sm min-h-[120px] resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                      <Button type="submit" disabled={submittingSuggestion}>
                        {submittingSuggestion ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
                        {submittingSuggestion ? "Submitting..." : "Submit"}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  {suggestions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No feedback yet. Be the first to share your thoughts!</p>
                    </div>
                  ) : (
                    suggestions.map((s) => (
                      <div key={s.id} className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-white">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            {s.type === "bug" ? <Bug className="w-5 h-5 text-red-500" /> : s.type === "idea" ? <Lightbulb className="w-5 h-5 text-amber-500" /> : s.type === "improvement" ? <ThumbsUp className="w-5 h-5 text-emerald-500" /> : <MessageSquare className="w-5 h-5 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm text-gray-900">{s.title}</span>
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getStatusBadge(s.status)}`}>{s.status.replace("_", " ")}</span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{s.description}</p>
                            {s.admin_response && (
                              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Admin Response</span>
                                </div>
                                <p className="text-sm text-gray-800 leading-relaxed">{s.admin_response}</p>
                                {s.responded_at && <p className="text-xs text-gray-400 mt-1.5">{new Date(s.responded_at).toLocaleDateString()}</p>}
                              </div>
                            )}
                            <p className="text-xs text-gray-400 mt-2">Submitted {new Date(s.created_at).toLocaleDateString()}</p>
                          </div>
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

/* ─── InfoRow ─── */
function InfoRow({ icon, label, value, className = "" }: { icon: React.ReactNode; label: string; value: string | undefined | null; className?: string }) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</div>
        <div className="text-sm text-gray-900 font-semibold mt-0.5">{value || "—"}</div>
      </div>
    </div>
  );
}
