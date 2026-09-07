"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Table, TableHead, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/Table";
import {
  Loader2, Download, Database, Trash2, X, FileJson, FileSpreadsheet,
  FileText, Eye, Clock, CheckCircle, AlertTriangle, RefreshCw,
  HardDrive, Calendar, Filter
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface DataExport {
  id: string;
  name: string;
  export_type: string;
  table_name: string | null;
  filters: Record<string, unknown> | null;
  file_url: string | null;
  file_size: number | null;
  status: string;
  error_message: string | null;
  created_by: string;
  completed_at: string | null;
  created_at: string | null;
}

interface TableOption {
  name: string;
  label: string;
}

const TABLE_OPTIONS: TableOption[] = [
  { name: "profiles", label: "Profiles" },
  { name: "students", label: "Students" },
  { name: "staff", label: "Staff" },
  { name: "classes", label: "Classes" },
  { name: "subjects", label: "Subjects" },
  { name: "campuses", label: "Campuses" },
  { name: "fee_structures", label: "Fee Structures" },
  { name: "fee_payments", label: "Fee Payments" },
  { name: "announcements", label: "Announcements" },
  { name: "calendar_events", label: "Calendar Events" },
  { name: "attendance", label: "Attendance" },
  { name: "grades", label: "Grades" },
  { name: "admissions", label: "Admissions" },
  { name: "library_resources", label: "Library Resources" },
];

export default function BackupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [exports, setExports] = useState<DataExport[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<{
    table: string;
    preview: unknown[];
    total_count: number;
    columns: string[];
  } | null>(null);

  const [exportForm, setExportForm] = useState({
    table_name: "profiles",
    format: "json",
    name: "",
    filters: {
      campus_id: "",
      date_from: "",
      date_to: "",
      status: "",
    },
  });

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchExports = useCallback(async () => {
    setIsLoading(true);
    try {
      const [exportsRes, tablesRes] = await Promise.all([
        apiGet<{ exports: DataExport[] }>("/api/admin/backup?type=exports"),
        apiGet<{ tables: string[] }>("/api/admin/backup?type=tables"),
      ]);
      setExports(exportsRes.exports || []);
      setTables(tablesRes.tables || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.user_category === "admin") {
      fetchExports();
    }
  }, [user, fetchExports]);

  const handlePreview = async () => {
    setSaving(true);
    try {
      const data = await apiPost<{
        success: boolean;
        table: string;
        preview: unknown[];
        total_count: number;
        columns: string[];
      }>("/api/admin/backup", {
        action: "preview",
        table_name: exportForm.table_name,
        filters: exportForm.filters,
      });
      setPreviewData(data);
      setShowPreviewModal(true);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!exportForm.name.trim()) {
      toast.error("Export name is required");
      return;
    }

    setSaving(true);
    try {
      await apiPost("/api/admin/backup", {
        action: "export",
        table_name: exportForm.table_name,
        format: exportForm.format,
        name: exportForm.name.trim(),
        filters: exportForm.filters,
      });
      toast.success("Export queued. Check the list for progress.");
      setShowExportModal(false);
      setExportForm({
        table_name: "profiles",
        format: "json",
        name: "",
        filters: { campus_id: "", date_from: "", date_to: "", status: "" },
      });
      await fetchExports();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExport = async (id: string) => {
    if (!confirm("Delete this export?")) return;
    try {
      await apiDelete(`/api/admin/backup?export_id=${id}`);
      toast.success("Export deleted");
      await fetchExports();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDownload = (exportRecord: DataExport) => {
    if (!exportRecord.file_url) {
      toast.error("File not ready yet");
      return;
    }
    const a = document.createElement("a");
    a.href = exportRecord.file_url;
    a.download = exportRecord.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge variant="success">Completed</Badge>;
      case "running": return <Badge variant="warning">Running</Badge>;
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      case "failed": return <Badge variant="danger">Failed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "json": return <FileJson className="w-5 h-5 text-blue-400" />;
      case "csv": return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      default: return <FileText className="w-5 h-5 text-amber-400" />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bdja-dark">
        <Loader2 className="w-8 h-8 animate-spin text-bdja-secondary" />
      </div>
    );
  }

  if (user?.user_category !== "admin") return null;

  return (
    <div className="min-h-screen bg-bdja-dark text-slate-100">
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                <HardDrive className="w-7 h-7 text-bdja-secondary" />
                Data Backup & Export
              </h1>
              <p className="text-slate-400 mt-1">Export any table as CSV or JSON, manage backups</p>
            </div>
            <Button onClick={() => setShowExportModal(true)}>
              <Download className="w-4 h-4" />
              New Export
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
        >
          {[
            { label: "Total Exports", value: exports.length, icon: Database, color: "text-blue-400" },
            { label: "Completed", value: exports.filter((e) => e.status === "completed").length, icon: CheckCircle, color: "text-emerald-400" },
            { label: "Pending", value: exports.filter((e) => e.status === "pending" || e.status === "running").length, icon: Clock, color: "text-amber-400" },
            { label: "Failed", value: exports.filter((e) => e.status === "failed").length, icon: AlertTriangle, color: "text-red-400" },
          ].map((stat, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold text-slate-200">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Export List */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Export History</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-bdja-secondary" />
            </div>
          ) : exports.length === 0 ? (
            <Card className="p-12 text-center">
              <Database className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-1">No exports yet</h3>
              <p className="text-slate-500 text-sm mb-4">Create your first data export to get started</p>
              <Button onClick={() => setShowExportModal(true)}>
                <Download className="w-4 h-4" />
                New Export
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {exports.map((exp, index) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                          {getFormatIcon(exp.export_type)}
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-200">{exp.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            {getStatusBadge(exp.status)}
                            <span className="text-xs text-slate-500">
                              {exp.table_name} • {new Date(exp.created_at || "").toLocaleDateString()}
                            </span>
                            {exp.file_size && (
                              <span className="text-xs text-slate-500">
                                {(exp.file_size / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                          {exp.error_message && (
                            <p className="text-xs text-red-400 mt-1">{exp.error_message}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {exp.status === "completed" && exp.file_url && (
                          <Button variant="outline" size="sm" onClick={() => handleDownload(exp)}>
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button variant="danger" size="sm" onClick={() => handleDeleteExport(exp.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Export Modal */}
        <Modal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="New Data Export"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Table</label>
                <Select
                  value={exportForm.table_name}
                  onChange={(e) => setExportForm({ ...exportForm, table_name: e.target.value })}
                  className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                >
                  {TABLE_OPTIONS.map((t) => (
                    <option key={t.name} value={t.name}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Format</label>
                <Select
                  value={exportForm.format}
                  onChange={(e) => setExportForm({ ...exportForm, format: e.target.value })}
                  className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Export Name</label>
              <Input
                value={exportForm.name}
                onChange={(e) => setExportForm({ ...exportForm, name: e.target.value })}
                placeholder={`${exportForm.table_name}_backup_${new Date().toISOString().split("T")[0]}`}
                className="bg-slate-800/60 border-slate-700/50 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Campus Filter</label>
                <Input
                  value={exportForm.filters.campus_id}
                  onChange={(e) => setExportForm({ ...exportForm, filters: { ...exportForm.filters, campus_id: e.target.value } })}
                  placeholder="Campus ID"
                  className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Status Filter</label>
                <Input
                  value={exportForm.filters.status}
                  onChange={(e) => setExportForm({ ...exportForm, filters: { ...exportForm.filters, status: e.target.value } })}
                  placeholder="e.g. active"
                  className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Date From</label>
                <Input
                  type="date"
                  value={exportForm.filters.date_from}
                  onChange={(e) => setExportForm({ ...exportForm, filters: { ...exportForm.filters, date_from: e.target.value } })}
                  className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Date To</label>
                <Input
                  type="date"
                  value={exportForm.filters.date_to}
                  onChange={(e) => setExportForm({ ...exportForm, filters: { ...exportForm.filters, date_to: e.target.value } })}
                  className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handlePreview} isLoading={saving} variant="secondary">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button onClick={handleExport} isLoading={saving}>
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button variant="outline" onClick={() => setShowExportModal(false)}>
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        {/* Preview Modal */}
        <Modal
          isOpen={showPreviewModal}
          onClose={() => { setShowPreviewModal(false); setPreviewData(null); }}
          title={previewData ? `Preview: ${previewData.table}` : "Preview"}
          size="xl"
        >
          {previewData && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="info">{previewData.total_count} total records</Badge>
                <span className="text-sm text-slate-400">Showing first 10 rows</span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-700/50 max-h-80 overflow-y-auto">
                <Table>
                  <TableHead>
                    <tr>
                      {previewData.columns.map((col) => (
                        <TableHeader key={col}>{col}</TableHeader>
                      ))}
                    </tr>
                  </TableHead>
                  <TableBody>
                    {previewData.preview.map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row as Record<string, unknown>).map((val, j) => (
                          <TableCell key={j} className="text-xs max-w-[200px] truncate">
                            {val === null || val === undefined ? "—" : String(val)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleExport} isLoading={saving}>
                  <Download className="w-4 h-4" />
                  Export All {previewData.total_count} Records
                </Button>
                <Button variant="outline" onClick={() => { setShowPreviewModal(false); setPreviewData(null); }}>
                  <X className="w-4 h-4" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
