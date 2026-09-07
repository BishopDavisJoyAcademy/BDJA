"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Loader2, Upload, FileSpreadsheet, X, CheckCircle, AlertTriangle,
  ArrowRight, Trash2, Download, Clock, ChevronDown, ChevronUp,
  RefreshCw, FileCheck, AlertCircle, Eye
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface ImportBatch {
  id: string;
  import_type: string;
  file_name: string;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  status: string;
  error_summary: Array<{ row: number; error: string }> | null;
  created_by: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

interface ImportRow {
  id: string;
  batch_id: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  status: string;
  validation_errors: string[] | null;
  imported_record_id: string | null;
}

const IMPORT_TYPES = [
  { value: "students", label: "Students", fields: ["first_name", "last_name", "grade_level", "parent_email", "parent_phone", "date_of_birth", "gender", "campus_id"] },
  { value: "staff", label: "Staff", fields: ["full_name", "email", "phone", "department", "designation", "employee_id", "join_date", "campus_id"] },
  { value: "parents", label: "Parents", fields: ["full_name", "email", "phone", "campus_id"] },
];

export default function ImportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [importType, setImportType] = useState("students");
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<{
    total: number;
    valid: number;
    invalid: number;
    rows: Array<{
      row_number: number;
      raw_data: Record<string, unknown>;
      status: string;
      validation_errors: string[];
    }>;
  } | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);
  const [batchRows, setBatchRows] = useState<ImportRow[]>([]);
  const [showBatchDetail, setShowBatchDetail] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchBatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<{ batches: ImportBatch[] }>("/api/admin/import?type=batches");
      setBatches(data.batches || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.user_category === "admin") {
      fetchBatches();
    }
  }, [user, fetchBatches]);

  const parseCSV = (text: string): { headers: string[]; rows: Record<string, unknown>[] } => {
    const lines = text.trim().split("\n").filter((l) => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const csvHeaders = parseLine(lines[0]);
    const csvRows: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row: Record<string, unknown> = {};
      csvHeaders.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      csvRows.push(row);
    }

    return { headers: csvHeaders, rows: csvRows };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      const { headers: h, rows: r } = parseCSV(text);
      setHeaders(h);
      setParsedRows(r);

      // Auto-map headers to known fields
      const typeConfig = IMPORT_TYPES.find((t) => t.value === importType);
      const autoMapping: Record<string, string> = {};
      if (typeConfig) {
        for (const header of h) {
          const lowerHeader = header.toLowerCase().replace(/[_\s]/g, "");
          for (const field of typeConfig.fields) {
            const lowerField = field.toLowerCase().replace(/[_\s]/g, "");
            if (lowerHeader === lowerField || lowerHeader.includes(lowerField) || lowerField.includes(lowerHeader)) {
              autoMapping[header] = field;
              break;
            }
          }
        }
      }
      setMapping(autoMapping);
      setShowMapping(true);
      toast.success(`Loaded ${r.length} rows from ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    if (parsedRows.length === 0) {
      toast.error("No rows to validate");
      return;
    }

    setSaving(true);
    try {
      const data = await apiPost<{
        success: boolean;
        total: number;
        valid: number;
        invalid: number;
        rows: Array<{
          row_number: number;
          raw_data: Record<string, unknown>;
          status: string;
          validation_errors: string[];
        }>;
      }>("/api/admin/import", {
        action: "validate",
        import_type: importType,
        rows: parsedRows,
        mapping,
      });

      setValidationResults(data);
      setShowPreview(true);
      toast.success(`Validation complete: ${data.valid} valid, ${data.invalid} invalid`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!validationResults || validationResults.valid === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setSaving(true);
    try {
      const data = await apiPost<{
        success: boolean;
        batch_id: string;
        total: number;
        imported: number;
        failed: number;
      }>("/api/admin/import", {
        action: "import",
        import_type: importType,
        file_name: fileInputRef.current?.files?.[0]?.name || "import.csv",
        rows: validationResults.rows,
      });

      toast.success(`Import complete: ${data.imported} imported, ${data.failed} failed`);
      setShowPreview(false);
      setShowMapping(false);
      setCsvText("");
      setParsedRows([]);
      setHeaders([]);
      setMapping({});
      setValidationResults(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchBatches();
      setActiveTab("history");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleViewBatch = async (batch: ImportBatch) => {
    setSelectedBatch(batch);
    setShowBatchDetail(true);
    try {
      const data = await apiGet<{ batch: ImportBatch; rows: ImportRow[] }>(`/api/admin/import?batch_id=${batch.id}`);
      setBatchRows(data.rows || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteBatch = async (id: string) => {
    if (!confirm("Delete this import batch?")) return;
    try {
      await apiDelete(`/api/admin/import?batch_id=${id}`);
      toast.success("Batch deleted");
      await fetchBatches();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge variant="success">Completed</Badge>;
      case "importing": return <Badge variant="warning">Importing</Badge>;
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      case "failed": return <Badge variant="danger">Failed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const sampleCSV = () => {
    const typeConfig = IMPORT_TYPES.find((t) => t.value === importType);
    if (!typeConfig) return "";
    return typeConfig.fields.join(",") + "\n" + typeConfig.fields.map((f) => `sample_${f}`).join(",");
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
                <Upload className="w-7 h-7 text-bdja-secondary" />
                Bulk CSV Import
              </h1>
              <p className="text-slate-400 mt-1">Upload, validate, and import data in bulk</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-slate-700/50">
          {(["upload", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-bdja-secondary text-bdja-secondary"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "upload" ? "Upload & Import" : "Import History"}
            </button>
          ))}
        </div>

        {/* Upload Tab */}
        <AnimatePresence mode="wait">
          {activeTab === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Step 1: Select Type & Upload */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">1. Select Import Type</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {IMPORT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setImportType(type.value);
                        setParsedRows([]);
                        setHeaders([]);
                        setMapping({});
                        setValidationResults(null);
                        setShowMapping(false);
                        setShowPreview(false);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        importType === type.value
                          ? "border-bdja-secondary bg-bdja-secondary/10"
                          : "border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/60"
                      }`}
                    >
                      <h3 className="font-semibold text-slate-200">{type.label}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {type.fields.length} fields: {type.fields.slice(0, 4).join(", ")}...
                      </p>
                    </button>
                  ))}
                </div>

                <h2 className="text-lg font-semibold text-slate-200 mb-4">2. Upload CSV File</h2>
                <div
                  className="border-2 border-dashed border-slate-700/50 rounded-xl p-8 text-center hover:border-bdja-secondary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 font-medium">Click to upload CSV file</p>
                  <p className="text-slate-500 text-sm mt-1">or drag and drop here</p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([sampleCSV()], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${importType}_template.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Template
                  </Button>
                </div>
              </Card>

              {/* Step 3: Column Mapping */}
              <AnimatePresence>
                {showMapping && headers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card className="p-6">
                      <h2 className="text-lg font-semibold text-slate-200 mb-4">3. Column Mapping</h2>
                      <p className="text-sm text-slate-400 mb-4">
                        Map CSV columns to database fields. Auto-mapped fields are highlighted.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {headers.map((header) => (
                          <div key={header} className="space-y-1">
                            <label className="text-xs font-medium text-slate-400">{header}</label>
                            <Select
                              value={mapping[header] || ""}
                              onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                              className="bg-slate-800/60 border-slate-700/50 text-slate-100 text-xs"
                            >
                              <option value="">— Skip —</option>
                              {IMPORT_TYPES.find((t) => t.value === importType)?.fields.map((f) => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </Select>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <Button onClick={handleValidate} isLoading={saving}>
                          <CheckCircle className="w-4 h-4" />
                          Validate Data
                        </Button>
                        <span className="text-sm text-slate-500">{parsedRows.length} rows ready</span>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 4: Preview & Import */}
              <AnimatePresence>
                {showPreview && validationResults && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-200">4. Validation Results</h2>
                        <div className="flex items-center gap-3">
                          <Badge variant="success">{validationResults.valid} Valid</Badge>
                          <Badge variant="danger">{validationResults.invalid} Invalid</Badge>
                          <Badge variant="secondary">{validationResults.total} Total</Badge>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-slate-700/50 max-h-80 overflow-y-auto">
                        <Table>
                          <TableHead>
                            <tr>
                              <TableHeader>Row</TableHeader>
                              <TableHeader>Status</TableHeader>
                              <TableHeader>Errors</TableHeader>
                              {Object.keys(validationResults.rows[0]?.raw_data || {}).map((h) => (
                                <TableHeader key={h}>{h}</TableHeader>
                              ))}
                            </tr>
                          </TableHead>
                          <TableBody>
                            {validationResults.rows.map((row) => (
                              <TableRow key={row.row_number}>
                                <TableCell>{row.row_number}</TableCell>
                                <TableCell>
                                  {row.status === "valid" ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                  )}
                                </TableCell>
                                <TableCell>
                                  {row.validation_errors.length > 0 ? (
                                    <div className="space-y-0.5">
                                      {row.validation_errors.map((err, i) => (
                                        <p key={i} className="text-xs text-red-400">{err}</p>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-emerald-400">—</span>
                                  )}
                                </TableCell>
                                {Object.values(row.raw_data).map((val, i) => (
                                  <TableCell key={i} className="text-xs">
                                    {String(val || "—")}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex items-center gap-3 mt-4">
                        <Button onClick={handleImport} isLoading={saving} disabled={validationResults.valid === 0}>
                          <Upload className="w-4 h-4" />
                          Import {validationResults.valid} Valid Rows
                        </Button>
                        <Button variant="outline" onClick={() => { setShowPreview(false); }}>
                          <X className="w-4 h-4" />
                          Back to Mapping
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
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
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-bdja-secondary" />
                </div>
              ) : batches.length === 0 ? (
                <Card className="p-12 text-center">
                  <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300 mb-1">No imports yet</h3>
                  <p className="text-slate-500 text-sm">Upload your first CSV to see import history</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch, index) => (
                    <motion.div
                      key={batch.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-200">{batch.file_name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="gold">{batch.import_type}</Badge>
                                {getStatusBadge(batch.status)}
                                <span className="text-xs text-slate-500">
                                  {new Date(batch.created_at || "").toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                <span>{batch.total_rows} rows</span>
                                <span className="text-emerald-400">{batch.success_count} success</span>
                                {batch.error_count > 0 && (
                                  <span className="text-red-400">{batch.error_count} failed</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewBatch(batch)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteBatch(batch.id)}>
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

        {/* Batch Detail Modal */}
        <Modal
          isOpen={showBatchDetail}
          onClose={() => { setShowBatchDetail(false); setSelectedBatch(null); setBatchRows([]); }}
          title={selectedBatch ? `Import Details: ${selectedBatch.file_name}` : "Import Details"}
          size="xl"
        >
          {selectedBatch && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="gold">{selectedBatch.import_type}</Badge>
                {getStatusBadge(selectedBatch.status)}
                <span className="text-sm text-slate-400">
                  {selectedBatch.success_count} / {selectedBatch.total_rows} imported
                </span>
              </div>

              {selectedBatch.error_summary && selectedBatch.error_summary.length > 0 && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <h4 className="text-sm font-medium text-red-300 mb-2">Errors</h4>
                  {selectedBatch.error_summary.map((err, i) => (
                    <p key={i} className="text-xs text-red-300">Row {err.row}: {err.error}</p>
                  ))}
                </div>
              )}

              {batchRows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-700/50 max-h-80 overflow-y-auto">
                  <Table>
                    <TableHead>
                      <tr>
                        <TableHeader>Row</TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader>Data</TableHeader>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {batchRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.row_number}</TableCell>
                          <TableCell>
                            {row.status === "imported" ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            ) : row.status === "failed" ? (
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                            ) : (
                              <Badge variant="secondary">{row.status}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <pre className="text-slate-400 overflow-x-auto">
                              {JSON.stringify(row.raw_data, null, 2)}
                            </pre>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
