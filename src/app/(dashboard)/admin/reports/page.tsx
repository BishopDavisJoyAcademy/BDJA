"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Table, TableHead, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/Table";
import {
  Loader2, Plus, Trash2, X, FileText, Download, Calendar, Filter,
  BarChart3, FileSpreadsheet, FileJson, FileCode, CheckCircle, AlertTriangle,
  Eye, Copy, ChevronDown, Search, RefreshCw, Clock, Save
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  config: Record<string, unknown>;
  created_by: string;
  is_shared: boolean | null;
  created_at: string | null;
}

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

const REPORT_TYPES = [
  { value: "students", label: "Students", icon: FileText },
  { value: "staff", label: "Staff", icon: FileText },
  { value: "parents", label: "Parents", icon: FileText },
  { value: "attendance", label: "Attendance", icon: Calendar },
  { value: "assessments", label: "Assessments", icon: BarChart3 },
  { value: "fees", label: "Fees", icon: FileText },
  { value: "classes", label: "Classes", icon: FileText },
  { value: "custom", label: "Custom", icon: FileCode },
];

const EXPORT_FORMATS = [
  { value: "csv", label: "CSV", icon: FileSpreadsheet },
  { value: "json", label: "JSON", icon: FileJson },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "excel", label: "Excel", icon: FileSpreadsheet },
];

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"templates" | "generate" | "history">("templates");
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [exports, setExports] = useState<DataExport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);

  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    report_type: "students",
    is_shared: false,
  });

  const [generateForm, setGenerateForm] = useState({
    template_id: "",
    report_type: "students",
    format: "csv",
    name: "",
    filters: {
      campus_id: "",
      grade_level: "",
      status: "",
      date_from: "",
      date_to: "",
    },
  });

  const [reportData, setReportData] = useState<unknown[] | null>(null);
  const [reportCount, setReportCount] = useState(0);
  const [runningReport, setRunningReport] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<{ templates: ReportTemplate[] }>("/api/admin/reports?type=templates");
      setTemplates(data.templates || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchExports = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<{ exports: DataExport[] }>("/api/admin/reports?type=exports");
      setExports(data.exports || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.user_category === "admin") {
      fetchTemplates();
      fetchExports();
    }
  }, [user, fetchTemplates, fetchExports]);

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    setSaving(true);
    try {
      const config = {
        filters: generateForm.filters,
        columns: [],
        sort: [],
        group_by: null,
      };

      if (editingTemplate) {
        await apiPatch("/api/admin/reports", {
          id: editingTemplate.id,
          name: templateForm.name.trim(),
          description: templateForm.description.trim() || null,
          report_type: templateForm.report_type,
          config,
          is_shared: templateForm.is_shared,
        });
        toast.success("Template updated");
      } else {
        await apiPost("/api/admin/reports", {
          action: "create_template",
          name: templateForm.name.trim(),
          description: templateForm.description.trim() || null,
          report_type: templateForm.report_type,
          config,
          is_shared: templateForm.is_shared,
        });
        toast.success("Template created");
      }

      setShowTemplateModal(false);
      setEditingTemplate(null);
      setTemplateForm({ name: "", description: "", report_type: "students", is_shared: false });
      await fetchTemplates();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await apiDelete(`/api/admin/reports?id=${id}&type=template`);
      toast.success("Template deleted");
      await fetchTemplates();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRunReport = async () => {
    setRunningReport(true);
    try {
      const data = await apiPost<{ success: boolean; data: unknown[]; count: number; report_type: string }>("/api/admin/reports", {
        action: "run_report",
        report_type: generateForm.report_type,
        filters: generateForm.filters,
      });
      setReportData(data.data || []);
      setReportCount(data.count || 0);
      toast.success(`Report generated: ${data.count} records`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setRunningReport(false);
    }
  };

  const handleGenerateExport = async () => {
    if (!generateForm.name.trim()) {
      toast.error("Export name is required");
      return;
    }

    setSaving(true);
    try {
      await apiPost("/api/admin/reports", {
        action: "generate_export",
        name: generateForm.name.trim(),
        export_type: generateForm.format,
        table_name: generateForm.report_type,
        filters: generateForm.filters,
      });
      toast.success("Export queued. Check history for progress.");
      setShowGenerateModal(false);
      setGenerateForm({
        template_id: "",
        report_type: "students",
        format: "csv",
        name: "",
        filters: { campus_id: "", grade_level: "", status: "", date_from: "", date_to: "" },
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
      await apiDelete(`/api/admin/reports?id=${id}&type=export`);
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
                <BarChart3 className="w-7 h-7 text-bdja-secondary" />
                Reports & Exports
              </h1>
              <p className="text-slate-400 mt-1">Generate, export, and manage school reports</p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => { setShowGenerateModal(true); setReportData(null); }}>
                <Plus className="w-4 h-4" />
                New Report
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-slate-700/50">
          {(["templates", "generate", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-bdja-secondary text-bdja-secondary"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "templates" && "Templates"}
              {tab === "generate" && "Generate"}
              {tab === "history" && "Export History"}
            </button>
          ))}
        </div>

        {/* Templates Tab */}
        <AnimatePresence mode="wait">
          {activeTab === "templates" && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-200">Report Templates</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingTemplate(null);
                    setTemplateForm({ name: "", description: "", report_type: "students", is_shared: false });
                    setShowTemplateModal(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Create Template
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-bdja-secondary" />
                </div>
              ) : templates.length === 0 ? (
                <Card className="p-12 text-center">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300 mb-1">No templates yet</h3>
                  <p className="text-slate-500 text-sm mb-4">Create your first report template to get started</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingTemplate(null);
                      setTemplateForm({ name: "", description: "", report_type: "students", is_shared: false });
                      setShowTemplateModal(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Create Template
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template, index) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="h-full hover:border-bdja-secondary/30 transition-colors">
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <Badge variant="gold">{template.report_type}</Badge>
                            {template.is_shared && <Badge variant="info">Shared</Badge>}
                          </div>
                          <h3 className="font-semibold text-slate-200 mb-1">{template.name}</h3>
                          {template.description && (
                            <p className="text-sm text-slate-400 mb-3 line-clamp-2">{template.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTemplate(template);
                                setTemplateForm({
                                  name: template.name,
                                  description: template.description || "",
                                  report_type: template.report_type,
                                  is_shared: template.is_shared === true,
                                });
                                setShowTemplateModal(true);
                              }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setGenerateForm({
                                  template_id: template.id,
                                  report_type: template.report_type,
                                  format: "csv",
                                  name: `${template.name} - ${new Date().toISOString().split("T")[0]}`,
                                  filters: (((template.config as Record<string, unknown>)?.filters as Record<string, string> | undefined) || { campus_id: "", grade_level: "", status: "", date_from: "", date_to: "" }) as { campus_id: string; grade_level: string; status: string; date_from: string; date_to: string; },
                                });
                                setShowGenerateModal(true);
                              }}
                            >
                              <Download className="w-3.5 h-3.5" />
                              Use
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
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
          )}

          {/* Generate Tab */}
          {activeTab === "generate" && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-bdja-secondary" />
                  Report Filters
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Report Type</label>
                    <Select
                      value={generateForm.report_type}
                      onChange={(e) => setGenerateForm({ ...generateForm, report_type: e.target.value })}
                      className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                    >
                      {REPORT_TYPES.map((rt) => (
                        <option key={rt.value} value={rt.value}>{rt.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Export Format</label>
                    <Select
                      value={generateForm.format}
                      onChange={(e) => setGenerateForm({ ...generateForm, format: e.target.value })}
                      className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                    >
                      {EXPORT_FORMATS.map((ef) => (
                        <option key={ef.value} value={ef.value}>{ef.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Export Name</label>
                    <Input
                      value={generateForm.name}
                      onChange={(e) => setGenerateForm({ ...generateForm, name: e.target.value })}
                      placeholder="e.g. Student Report Q1"
                      className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Campus</label>
                    <Input
                      value={generateForm.filters.campus_id}
                      onChange={(e) => setGenerateForm({ ...generateForm, filters: { ...generateForm.filters, campus_id: e.target.value } })}
                      placeholder="Campus ID"
                      className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Grade Level</label>
                    <Input
                      value={generateForm.filters.grade_level}
                      onChange={(e) => setGenerateForm({ ...generateForm, filters: { ...generateForm.filters, grade_level: e.target.value } })}
                      placeholder="e.g. Grade 1"
                      className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                    <Input
                      value={generateForm.filters.status}
                      onChange={(e) => setGenerateForm({ ...generateForm, filters: { ...generateForm.filters, status: e.target.value } })}
                      placeholder="e.g. active"
                      className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Date From</label>
                    <Input
                      type="date"
                      value={generateForm.filters.date_from}
                      onChange={(e) => setGenerateForm({ ...generateForm, filters: { ...generateForm.filters, date_from: e.target.value } })}
                      className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Date To</label>
                    <Input
                      type="date"
                      value={generateForm.filters.date_to}
                      onChange={(e) => setGenerateForm({ ...generateForm, filters: { ...generateForm.filters, date_to: e.target.value } })}
                      className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={handleRunReport} isLoading={runningReport} variant="secondary">
                    <Eye className="w-4 h-4" />
                    Preview Report
                  </Button>
                  <Button onClick={handleGenerateExport} isLoading={saving}>
                    <Download className="w-4 h-4" />
                    Generate Export
                  </Button>
                </div>

                {/* Preview */}
                {reportData && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-200">
                        Preview ({reportCount} records)
                      </h3>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                      <Table>
                        <TableHead>
                          <tr>
                            {reportData.length > 0 && Object.keys(reportData[0] as Record<string, unknown>).map((key) => (
                              <TableHeader key={key}>{key}</TableHeader>
                            ))}
                          </tr>
                        </TableHead>
                        <TableBody>
                          {reportData.slice(0, 10).map((row, i) => (
                            <TableRow key={i}>
                              {Object.values(row as Record<string, unknown>).map((val, j) => (
                                <TableCell key={j}>
                                  {val === null || val === undefined ? "—" : String(val)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {reportData.length > 10 && (
                      <p className="text-sm text-slate-500 mt-2 text-center">
                        Showing 10 of {reportCount} records. Export to see all.
                      </p>
                    )}
                  </motion.div>
                )}
              </Card>
            </motion.div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <h2 className="text-lg font-semibold text-slate-200 mb-4">Export History</h2>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-bdja-secondary" />
                </div>
              ) : exports.length === 0 ? (
                <Card className="p-12 text-center">
                  <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300 mb-1">No exports yet</h3>
                  <p className="text-slate-500 text-sm">Generate your first export to see it here</p>
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
                              {exp.export_type === "csv" ? (
                                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                              ) : exp.export_type === "json" ? (
                                <FileJson className="w-5 h-5 text-blue-400" />
                              ) : (
                                <FileText className="w-5 h-5 text-amber-400" />
                              )}
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
          )}
        </AnimatePresence>

        {/* Template Modal */}
        <Modal
          isOpen={showTemplateModal}
          onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); }}
          title={editingTemplate ? "Edit Template" : "Create Template"}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="Template name"
                className="bg-slate-800/60 border-slate-700/50 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <Input
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder="Optional description"
                className="bg-slate-800/60 border-slate-700/50 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Report Type</label>
              <Select
                value={templateForm.report_type}
                onChange={(e) => setTemplateForm({ ...templateForm, report_type: e.target.value })}
                className="bg-slate-800/60 border-slate-700/50 text-slate-100"
              >
                {REPORT_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_shared"
                checked={templateForm.is_shared}
                onChange={(e) => setTemplateForm({ ...templateForm, is_shared: e.target.checked })}
                className="rounded border-slate-600 bg-slate-800 text-bdja-secondary"
              />
              <label htmlFor="is_shared" className="text-sm text-slate-300">Share with other admins</label>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSaveTemplate} isLoading={saving} className="flex-1">
                <Save className="w-4 h-4" />
                {editingTemplate ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }}>
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        {/* Generate Modal */}
        <Modal
          isOpen={showGenerateModal}
          onClose={() => { setShowGenerateModal(false); setReportData(null); }}
          title="Generate Report"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Report Type</label>
                <Select
                  value={generateForm.report_type}
                  onChange={(e) => setGenerateForm({ ...generateForm, report_type: e.target.value })}
                  className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                >
                  {REPORT_TYPES.map((rt) => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Format</label>
                <Select
                  value={generateForm.format}
                  onChange={(e) => setGenerateForm({ ...generateForm, format: e.target.value })}
                  className="bg-slate-800/60 border-slate-700/50 text-slate-100"
                >
                  {EXPORT_FORMATS.map((ef) => (
                    <option key={ef.value} value={ef.value}>{ef.label}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Export Name</label>
              <Input
                value={generateForm.name}
                onChange={(e) => setGenerateForm({ ...generateForm, name: e.target.value })}
                placeholder="Export name"
                className="bg-slate-800/60 border-slate-700/50 text-slate-100"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleRunReport} isLoading={runningReport} variant="secondary">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button onClick={handleGenerateExport} isLoading={saving}>
                <Download className="w-4 h-4" />
                Generate
              </Button>
              <Button variant="outline" onClick={() => { setShowGenerateModal(false); setReportData(null); }}>
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>

            {reportData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                <div className="overflow-x-auto rounded-lg border border-slate-700/50 max-h-64 overflow-y-auto">
                  <Table>
                    <TableHead>
                      <tr>
                        {reportData.length > 0 && Object.keys(reportData[0] as Record<string, unknown>).map((key) => (
                          <TableHeader key={key}>{key}</TableHeader>
                        ))}
                      </tr>
                    </TableHead>
                    <TableBody>
                      {reportData.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row as Record<string, unknown>).map((val, j) => (
                            <TableCell key={j}>
                              {val === null || val === undefined ? "—" : String(val)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {reportData.length > 5 && (
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Showing 5 of {reportCount} records
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}
