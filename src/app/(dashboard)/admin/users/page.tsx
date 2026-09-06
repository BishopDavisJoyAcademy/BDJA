"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { apiGet, apiPatch } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Search, Users, Power, PowerOff, Mail, MessageSquare, Eye, Loader2,
  Filter, ChevronDown, ChevronUp, RefreshCw, Shield, GraduationCap,
  Briefcase, User, Building2, Calendar, Clock, AlertTriangle,
  ArrowUpDown, X
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
  password_changed: boolean;
  campus_id: string | null;
  campus_name?: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
  staff?: { department: string | null; designation: string | null; employee_id: string | null; status: string | null } | null;
  students?: { admission_number: string | null; grade_level: string | null; class_id: string | null; status: string | null } | null;
}

interface UsersResponse {
  users: UserRecord[];
  total: number;
}

type SortField = "name" | "category" | "status" | "created" | "last_login";
type SortDir = "asc" | "desc";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories", icon: Users },
  { value: "admin", label: "Administrators", icon: Shield },
  { value: "staff", label: "Staff", icon: Briefcase },
  { value: "student", label: "Students", icon: GraduationCap },
  { value: "parent", label: "Parents", icon: User },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function UsersManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());
      params.set("sort", sortField);
      params.set("dir", sortDir);

      const endpoint = `/api/admin/users${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await apiGet<UsersResponse>(endpoint);
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, statusFilter, search, sortField, sortDir]);

  useEffect(() => {
    if (user?.user_category === "admin") {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  const toggleUserStatus = async (targetUser: UserRecord) => {
    setTogglingId(targetUser.id);
    try {
      await apiPatch("/api/admin/users", {
        id: targetUser.id,
        is_active: !targetUser.is_active,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: !u.is_active } : u))
      );
      setFilteredUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: !u.is_active } : u))
      );
      toast.success(`${targetUser.full_name} is now ${!targetUser.is_active ? "active" : "inactive"}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "admin": return Shield;
      case "staff": return Briefcase;
      case "student": return GraduationCap;
      case "parent": return User;
      default: return Users;
    }
  };

  const getCategoryVariant = (category: string) => {
    switch (category) {
      case "admin": return "danger";
      case "staff": return "info";
      case "student": return "success";
      case "parent": return "warning";
      default: return "default";
    }
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    inactive: users.filter((u) => !u.is_active).length,
    admins: users.filter((u) => u.user_category === "admin").length,
    staff: users.filter((u) => u.user_category === "staff").length,
    students: users.filter((u) => u.user_category === "student").length,
    parents: users.filter((u) => u.user_category === "parent").length,
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
        <div>
          <h1 className="text-2xl font-bold text-slate-100">All Users</h1>
          <p className="text-slate-400">Manage every user across the platform</p>
        </div>
        <Button onClick={fetchUsers} variant="outline" className="border-slate-700/50 text-slate-300">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3"
      >
        {[
          { label: "Total", value: stats.total, icon: Users, color: "text-[#D4AF37]" },
          { label: "Active", value: stats.active, icon: Power, color: "text-emerald-400" },
          { label: "Inactive", value: stats.inactive, icon: PowerOff, color: "text-red-400" },
          { label: "Admins", value: stats.admins, icon: Shield, color: "text-purple-400" },
          { label: "Staff", value: stats.staff, icon: Briefcase, color: "text-blue-400" },
          { label: "Students", value: stats.students, icon: GraduationCap, color: "text-emerald-400" },
          { label: "Parents", value: stats.parents, icon: User, color: "text-amber-400" },
        ].map((stat) => (
          <Card key={stat.label} className="p-3 flex items-center gap-3">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
            <div>
              <p className="text-xl font-bold text-slate-100">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by name, email, admission number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
            className="pl-10 bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600"
          />
        </div>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          className={`border-slate-700/50 ${showFilters ? "text-[#D4AF37] border-[#D4AF37]/30" : "text-slate-400"}`}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
        <Button onClick={fetchUsers} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </motion.div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-3"
          >
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button
              onClick={() => { setCategoryFilter("all"); setStatusFilter("all"); setSearch(""); }}
              variant="ghost"
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Users className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-lg font-medium text-slate-400">No users found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeader>User</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Role</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Last Login</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                <AnimatePresence>
                  {filteredUsers.map((u, index) => {
                    const CategoryIcon = getCategoryIcon(u.user_category);
                    return (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-slate-800/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700/50">
                              {u.avatar_url ? (
                                <Image src={u.avatar_url} alt={u.full_name} width={36} height={36} className="object-cover" />
                              ) : (
                                <CategoryIcon className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-200">{u.full_name}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                              {u.students?.admission_number && (
                                <p className="text-xs text-slate-600">{u.students.admission_number}</p>
                              )}
                              {u.staff?.employee_id && (
                                <p className="text-xs text-slate-600">ID: {u.staff.employee_id}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getCategoryVariant(u.user_category)}>
                            {u.user_category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-300 capitalize">{u.role.replace(/_/g, " ")}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.is_active ? "success" : "secondary"}>
                            {u.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {!u.password_changed && (
                            <Badge variant="warning" className="ml-1.5">First Login</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs">
                              {u.last_login_at
                                ? new Date(u.last_login_at).toLocaleDateString()
                                : "Never"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setSelectedUser(u); setShowDetailModal(true); }}
                              className="text-slate-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleUserStatus(u)}
                              disabled={togglingId === u.id}
                              className={u.is_active
                                ? "text-emerald-400 hover:text-red-400 hover:bg-red-500/10"
                                : "text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                              }
                            >
                              {togglingId === u.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : u.is_active ? (
                                <PowerOff className="w-4 h-4" />
                              ) : (
                                <Power className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </Card>
      </motion.div>

      {/* User Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="User Details"
        size="lg"
      >
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
                  <Badge variant={getCategoryVariant(selectedUser.user_category)}>
                    {selectedUser.user_category}
                  </Badge>
                  <Badge variant={selectedUser.is_active ? "success" : "secondary"}>
                    {selectedUser.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Role</p>
                <p className="text-slate-200 font-medium capitalize">{selectedUser.role.replace(/_/g, " ")}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Phone</p>
                <p className="text-slate-200 font-medium">{selectedUser.phone || "—"}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Created</p>
                <p className="text-slate-200 font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Last Login</p>
                <p className="text-slate-200 font-medium">
                  {selectedUser.last_login_at
                    ? new Date(selectedUser.last_login_at).toLocaleString()
                    : "Never logged in"}
                </p>
              </Card>
            </div>

            {selectedUser.staff && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#D4AF37]" />
                  Staff Information
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3">
                    <p className="text-xs text-slate-500">Department</p>
                    <p className="text-slate-200">{selectedUser.staff.department || "—"}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-slate-500">Designation</p>
                    <p className="text-slate-200">{selectedUser.staff.designation || "—"}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-slate-500">Employee ID</p>
                    <p className="text-slate-200">{selectedUser.staff.employee_id || "—"}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="text-slate-200 capitalize">{selectedUser.staff.status || "—"}</p>
                  </Card>
                </div>
              </div>
            )}

            {selectedUser.students && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
                  Student Information
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3">
                    <p className="text-xs text-slate-500">Admission Number</p>
                    <p className="text-slate-200">{selectedUser.students.admission_number || "—"}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-slate-500">Grade Level</p>
                    <p className="text-slate-200">{selectedUser.students.grade_level || "—"}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-slate-500">Class ID</p>
                    <p className="text-slate-200">{selectedUser.students.class_id || "—"}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="text-slate-200 capitalize">{selectedUser.students.status || "—"}</p>
                  </Card>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => {
                  setShowDetailModal(false);
                  toggleUserStatus(selectedUser);
                }}
                className={selectedUser.is_active
                  ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                }
              >
                {selectedUser.is_active ? (
                  <><PowerOff className="w-4 h-4 mr-2" />Deactivate</>
                ) : (
                  <><Power className="w-4 h-4 mr-2" />Activate</>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
