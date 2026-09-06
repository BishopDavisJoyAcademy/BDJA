"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { apiGet, apiPost, apiPatch } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Crown, Search, Loader2, Shield, Users, GraduationCap, Briefcase,
  Power, PowerOff, Eye, Clock, Activity, Fingerprint, Zap, X,
  AlertTriangle, CheckCircle, UserX, Lock, Unlock, Filter,
  Trash2, RefreshCw, Terminal, Building2
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  user_category: string;
  is_active: boolean;
  campus_id: string | null;
  campus_name?: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
  staff?: { department: string | null; designation: string | null; employee_id: string | null } | null;
  students?: { admission_number: string | null; grade_level: string | null } | null;
}

interface SessionRecord {
  id: string;
  user_id: string;
  device_info: string | null;
  ip_address: string | null;
  created_at: string;
  last_active_at: string | null;
  revoked_at: string | null;
}

interface ActivityRecord {
  id: string;
  action: string;
  table_name: string | null;
  created_at: string;
}

interface PermissionRecord {
  key: string;
  name: string;
  category: string;
  granted: boolean;
}

export default function SovereignViewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());

      const data = await apiGet<{ users: UserRecord[] }>(`/api/admin/sovereign-view?${params.toString()}`);
      setUsers(data.users || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, statusFilter, search]);

  useEffect(() => {
    if (user?.user_category === "admin") fetchUsers();
  }, [user, fetchUsers]);

  const fetchSessions = async (userId: string) => {
    setLoadingSessions(true);
    try {
      const data = await apiGet<{ sessions: SessionRecord[] }>(`/api/admin/sessions?userId=${userId}`);
      setSessions(data.sessions || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchActivity = async (userId: string) => {
    setLoadingActivity(true);
    try {
      const data = await apiGet<{ activity: ActivityRecord[] }>(`/api/admin/sovereign-view/activity?userId=${userId}`);
      setActivity(data.activity || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingActivity(false);
    }
  };

  const fetchPermissions = async (profileId: string) => {
    setLoadingPermissions(true);
    try {
      const data = await apiGet<{ permissions: PermissionRecord[] }>(`/api/admin/sovereign-view/permissions?profileId=${profileId}`);
      setPermissions(data.permissions || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingPermissions(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await apiPatch("/api/admin/sessions", { sessionId });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session revoked");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const revokeAllSessions = async (userId: string) => {
    if (!confirm("Revoke ALL active sessions for this user? They will be logged out everywhere.")) return;
    try {
      await apiPatch("/api/admin/sessions", { userId, revokeAll: true });
      setSessions([]);
      toast.success("All sessions revoked");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const togglePermission = async (userId: string, permissionKey: string, granted: boolean) => {
    try {
      await apiPost("/api/admin/sovereign-view/permissions", { profileId: userId, permissionKey, granted });
      setPermissions((prev) =>
        prev.map((p) => (p.key === permissionKey ? { ...p, granted } : p))
      );
      toast.success(`Permission ${granted ? "granted" : "revoked"}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const impersonate = async (targetUser: UserRecord) => {
    setImpersonating(targetUser.id);
    try {
      await apiPost("/api/admin/impersonate", { targetUserId: targetUser.id });
      toast.success(`Now viewing as ${targetUser.full_name}`);
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setImpersonating(null);
    }
  };

  const bulkToggle = async (activate: boolean) => {
    if (selectedUserIds.size === 0) {
      toast.error("Select users first");
      return;
    }
    setBulkActionLoading(true);
    try {
      await apiPost("/api/admin/sovereign-view/bulk", {
        userIds: Array.from(selectedUserIds),
        action: activate ? "activate" : "deactivate",
      });
      setUsers((prev) =>
        prev.map((u) =>
          selectedUserIds.has(u.id) ? { ...u, is_active: activate } : u
        )
      );
      setSelectedUserIds(new Set());
      toast.success(`${selectedUserIds.size} users ${activate ? "activated" : "deactivated"}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setBulkActionLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    }
  };

  const openDetail = (u: UserRecord) => {
    setSelectedUser(u);
    setShowDetailModal(true);
  };

  const openSessions = (u: UserRecord) => {
    setSelectedUser(u);
    fetchSessions(u.id);
    setShowSessionsModal(true);
  };

  const openActivity = (u: UserRecord) => {
    setSelectedUser(u);
    fetchActivity(u.id);
    setShowActivityModal(true);
  };

  const openPermissions = (u: UserRecord) => {
    setSelectedUser(u);
    fetchPermissions(u.id);
    setShowPermissionsModal(true);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "admin": return Shield;
      case "staff": return Briefcase;
      case "student": return GraduationCap;
      case "parent": return Users;
      default: return Users;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "admin": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "staff": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "student": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "parent": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default: return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
            <Crown className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Sovereign View</h1>
            <p className="text-slate-400">Total control over every user, session, and action</p>
          </div>
        </div>
        <Button onClick={fetchUsers} variant="outline" className="border-slate-700/50 text-slate-300">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search users by name, email, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
            className="pl-10 bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
        >
          <option value="all">All Categories</option>
          <option value="admin">Admins</option>
          <option value="staff">Staff</option>
          <option value="student">Students</option>
          <option value="parent">Parents</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button onClick={fetchUsers} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </motion.div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedUserIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl"
          >
            <span className="text-sm text-[#D4AF37] font-medium">
              {selectedUserIds.size} selected
            </span>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={() => bulkToggle(true)}
              disabled={bulkActionLoading}
              className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
            >
              <Power className="w-4 h-4 mr-1" />
              Activate
            </Button>
            <Button
              size="sm"
              onClick={() => bulkToggle(false)}
              disabled={bulkActionLoading}
              className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
            >
              <PowerOff className="w-4 h-4 mr-1" />
              Deactivate
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds(new Set())} className="text-slate-500">
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Select All */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selectedUserIds.size === users.length && users.length > 0}
          onChange={selectAll}
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-[#D4AF37] focus:ring-[#D4AF37]/30"
        />
        <span className="text-sm text-slate-500">Select all ({users.length})</span>
      </div>

      {/* User Cards Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        <AnimatePresence>
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full flex flex-col items-center justify-center py-16 text-slate-500"
            >
              <Crown className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-lg font-medium text-slate-400">No users found</p>
            </motion.div>
          ) : (
            users.map((u, index) => {
              const CategoryIcon = getCategoryIcon(u.user_category);
              const isSelected = selectedUserIds.has(u.id);
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className={`p-4 transition-all hover:border-[#D4AF37]/30 ${isSelected ? "border-[#D4AF37]/50 bg-[#D4AF37]/5" : ""}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(u.id)}
                        className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-[#D4AF37] focus:ring-[#D4AF37]/30"
                      />
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700/50 flex-shrink-0">
                        {u.avatar_url ? (
                          <Image src={u.avatar_url} alt={u.full_name} width={48} height={48} className="object-cover" />
                        ) : (
                          <CategoryIcon className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-100 truncate">{u.full_name}</h3>
                          <Badge variant={u.is_active ? "success" : "secondary"} className="text-[10px]">
                            {u.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getCategoryColor(u.user_category)}`}>
                            {u.user_category}
                          </span>
                          {u.campus_name && (
                            <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                              <Building2 className="w-3 h-3" />
                              {u.campus_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-4 gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDetail(u)}
                        className="text-slate-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openSessions(u)}
                        className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                        title="Manage Sessions"
                      >
                        <Fingerprint className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openActivity(u)}
                        className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                        title="Activity Timeline"
                      >
                        <Activity className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => impersonate(u)}
                        disabled={impersonating === u.id}
                        className="text-slate-400 hover:text-purple-400 hover:bg-purple-500/10"
                        title="Impersonate"
                      >
                        {impersonating === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </motion.div>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="User Profile" size="lg">
        {selectedUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border-2 border-[#D4AF37]/30">
                {selectedUser.avatar_url ? (
                  <Image src={selectedUser.avatar_url} alt={selectedUser.full_name} width={64} height={64} className="rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-[#D4AF37]">
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">{selectedUser.full_name}</h3>
                <p className="text-slate-400">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={selectedUser.is_active ? "success" : "secondary"}>
                    {selectedUser.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getCategoryColor(selectedUser.user_category)}`}>
                    {selectedUser.user_category}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Role</p><p className="text-slate-200 font-medium capitalize">{selectedUser.role.replace(/_/g, " ")}</p></Card>
              <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Phone</p><p className="text-slate-200 font-medium">{selectedUser.phone || "—"}</p></Card>
              <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Created</p><p className="text-slate-200 font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</p></Card>
              <Card className="p-3"><p className="text-xs text-slate-500 uppercase">Last Login</p><p className="text-slate-200 font-medium">{selectedUser.last_login_at ? new Date(selectedUser.last_login_at).toLocaleString() : "Never"}</p></Card>
            </div>

            <div className="flex gap-2 pt-2 flex-wrap">
              <Button onClick={() => { setShowDetailModal(false); openSessions(selectedUser); }} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20">
                <Fingerprint className="w-4 h-4 mr-2" />
                Sessions
              </Button>
              <Button onClick={() => { setShowDetailModal(false); openActivity(selectedUser); }} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">
                <Activity className="w-4 h-4 mr-2" />
                Activity
              </Button>
              <Button onClick={() => { setShowDetailModal(false); openPermissions(selectedUser); }} className="bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20">
                <Shield className="w-4 h-4 mr-2" />
                Permissions
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Sessions Modal */}
      <Modal isOpen={showSessionsModal} onClose={() => setShowSessionsModal(false)} title="Active Sessions" size="lg">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">{selectedUser.full_name}</p>
              <Button
                size="sm"
                onClick={() => revokeAllSessions(selectedUser.id)}
                className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Revoke All
              </Button>
            </div>
            {loadingSessions ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p>No active sessions</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sessions.map((s) => {
                  const deviceLabel = (() => {
                    if (!s.device_info) return "Unknown Device";
                    if (typeof s.device_info === "string") return s.device_info;
                    if (typeof s.device_info === "object" && s.device_info !== null) {
                      const obj = s.device_info as Record<string, unknown>;
                      return String(obj.user_agent || obj.browser || obj.device || JSON.stringify(s.device_info));
                    }
                    return "Unknown Device";
                  })();
                  const ipLabel = typeof s.ip_address === "string" ? s.ip_address : "Unknown IP";
                  return (
                    <Card key={s.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-200 font-medium">{deviceLabel}</p>
                        <p className="text-xs text-slate-500">{ipLabel}</p>
                        <p className="text-xs text-slate-600">Started {new Date(s.created_at).toLocaleString()}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revokeSession(s.id)}
                        className="text-red-400 hover:bg-red-500/10"
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Activity Modal */}
      <Modal isOpen={showActivityModal} onClose={() => setShowActivityModal(false)} title="Activity Timeline" size="lg">
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">{selectedUser.full_name} — Last 50 actions</p>
            {loadingActivity ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
              </div>
            ) : activity.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Activity className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activity.map((a) => (
                  <Card key={a.id} className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Terminal className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200">{a.action}</p>
                      <p className="text-xs text-slate-500">{a.table_name || "—"}</p>
                    </div>
                    <p className="text-xs text-slate-600 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Permissions Modal */}
      <Modal isOpen={showPermissionsModal} onClose={() => setShowPermissionsModal(false)} title="Permission Override" size="lg">
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">{selectedUser.full_name}</p>
            {loadingPermissions ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {permissions.map((perm) => (
                  <Card key={perm.key} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-200">{perm.name}</p>
                      <p className="text-xs text-slate-500">{perm.category}</p>
                    </div>
                    <button
                      onClick={() => togglePermission(selectedUser.id, perm.key, !perm.granted)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${perm.granted ? "bg-[#D4AF37]" : "bg-slate-700"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${perm.granted ? "translate-x-5" : ""}`} />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
