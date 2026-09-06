"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Shield, Search, Loader2, Calendar, User, Database, ArrowLeftRight,
  ChevronLeft, ChevronRight, Filter, X, Download, AlertTriangle,
  Clock, Eye, FileJson
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface AuditLog {
  id: string;
  user_id: string | null;
  user_name?: string | null;
  user_email?: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
  impersonated_user_id: string | null;
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  perPage: number;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
  LOGIN: "gold",
  LOGOUT: "secondary",
  IMPERSONATE: "warning",
  EXPORT: "info",
  IMPORT: "success",
  PASSWORD_RESET: "warning",
  PERMISSION_CHANGE: "gold",
};

const TABLE_ICONS: Record<string, React.ElementType> = {
  profiles: User,
  staff: User,
  students: User,
  classes: Database,
  subjects: Database,
  campuses: Database,
  fee_structures: Database,
  fee_payments: Database,
  library_resources: Database,
  library_borrowings: Database,
  cms_pages: Database,
  vora_content: Database,
  announcements: Database,
  calendar_events: Calendar,
  assignments: Database,
  attendance: Database,
  assessments: Database,
};

export default function AuditPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("perPage", String(perPage));
      if (search.trim()) params.set("q", search.trim());
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (tableFilter !== "all") params.set("table", tableFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const data = await apiGet<AuditResponse>(`/api/admin/audit?${params.toString()}`);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, search, actionFilter, tableFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (user?.user_category === "admin") fetchLogs();
  }, [user, fetchLogs]);

  const totalPages = Math.ceil(total / perPage);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionVariant = (action: string): string => {
    const base = action.split("_")[0];
    return ACTION_COLORS[base] || ACTION_COLORS[action] || "default";
  };

  const getTableIcon = (table: string | null) => {
    if (!table) return Database;
    return TABLE_ICONS[table] || Database;
  };

  const exportCSV = () => {
    const headers = ["Time", "User", "Action", "Table", "Record ID", "IP Address"];
    const rows = logs.map((log) => [
      log.created_at || "",
      log.user_name || log.user_id || "System",
      log.action,
      log.table_name || "",
      log.record_id || "",
      log.ip_address || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit logs exported");
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
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#D4AF37]" />
            Audit Logs
          </h1>
          <p className="text-slate-400">Track every action across the platform</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" className="border-slate-700/50 text-slate-300">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchLogs} variant="outline" className="border-slate-700/50 text-slate-300">
            <Loader2 className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
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
            placeholder="Search by user, action, or table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
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
        <Button onClick={fetchLogs} className="bg-[#D4AF37] hover:bg-[#C4A030] text-slate-900 font-semibold">
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
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            >
              <option value="all">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="IMPERSONATE">Impersonate</option>
              <option value="EXPORT">Export</option>
              <option value="IMPORT">Import</option>
            </select>
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            >
              <option value="all">All Tables</option>
              <option value="profiles">Profiles</option>
              <option value="staff">Staff</option>
              <option value="students">Students</option>
              <option value="classes">Classes</option>
              <option value="subjects">Subjects</option>
              <option value="campuses">Campuses</option>
              <option value="fee_structures">Fee Structures</option>
              <option value="fee_payments">Fee Payments</option>
              <option value="library_resources">Library Resources</option>
              <option value="cms_pages">CMS Pages</option>
              <option value="vora_content">VORA Content</option>
              <option value="announcements">Announcements</option>
              <option value="calendar_events">Calendar Events</option>
            </select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-auto bg-slate-900/60 border-slate-700/50 text-slate-100"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-auto bg-slate-900/60 border-slate-700/50 text-slate-100"
            />
            <Button
              onClick={() => { setActionFilter("all"); setTableFilter("all"); setDateFrom(""); setDateTo(""); setSearch(""); }}
              variant="ghost"
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
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

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <p>Showing {logs.length} of {total} records</p>
        <p>Page {page} of {totalPages || 1}</p>
      </div>

      {/* Logs Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Shield className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-lg font-medium text-slate-400">No audit logs found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeader>Action</TableHeader>
                    <TableHeader>Table</TableHeader>
                    <TableHeader>User</TableHeader>
                    <TableHeader>Time</TableHeader>
                    <TableHeader className="text-right">View</TableHeader>
                  </tr>
                </TableHead>
                <TableBody>
                  <AnimatePresence>
                    {logs.map((log, index) => {
                      const TableIcon = getTableIcon(log.table_name);
                      return (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: index * 0.01 }}
                          className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                          onClick={() => { setSelectedLog(log); setShowDetailModal(true); }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={getActionVariant(log.action) as never}>
                                {log.action}
                              </Badge>
                              {log.impersonated_user_id && (
                                <Badge variant="warning" className="text-[10px]">Impersonated</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate-300">
                              <TableIcon className="w-4 h-4 text-slate-500" />
                              <span>{log.table_name || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-slate-200">{log.user_name || log.user_id?.slice(0, 8) || "System"}</p>
                              {log.user_email && <p className="text-xs text-slate-500">{log.user_email}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-xs">{formatDate(log.created_at)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-slate-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
                  <Button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    variant="outline"
                    className="border-slate-700/50 text-slate-400"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            p === page
                              ? "bg-[#D4AF37] text-slate-900"
                              : "text-slate-400 hover:bg-slate-800"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    variant="outline"
                    className="border-slate-700/50 text-slate-400"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </motion.div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Audit Log Detail"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Badge variant={getActionVariant(selectedLog.action) as never} className="text-sm">
                {selectedLog.action}
              </Badge>
              <span className="text-slate-500">on</span>
              <Badge variant="outline">{selectedLog.table_name || "—"}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider">User</p>
                <p className="text-slate-200 font-medium">{selectedLog.user_name || selectedLog.user_id || "System"}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Time</p>
                <p className="text-slate-200 font-medium">{formatDate(selectedLog.created_at)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider">IP Address</p>
                <p className="text-slate-200 font-medium">{selectedLog.ip_address || "—"}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Record ID</p>
                <p className="text-slate-200 font-medium font-mono text-xs">{selectedLog.record_id || "—"}</p>
              </Card>
            </div>

            {selectedLog.impersonated_user_id && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-amber-400 text-sm font-medium">
                  This action was performed while impersonating user: {selectedLog.impersonated_user_id}
                </p>
              </div>
            )}

            {selectedLog.old_data && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-red-400" />
                  Previous Data
                </h4>
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 overflow-x-auto">
                  <pre className="text-xs text-red-400 font-mono">
                    {JSON.stringify(selectedLog.old_data, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {selectedLog.new_data && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
                  New Data
                </h4>
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 overflow-x-auto">
                  <pre className="text-xs text-emerald-400 font-mono">
                    {JSON.stringify(selectedLog.new_data, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {selectedLog.user_agent && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2">User Agent</h4>
                <p className="text-xs text-slate-500 font-mono break-all">{selectedLog.user_agent}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
