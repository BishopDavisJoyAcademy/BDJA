"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";

export interface ReportCard {
  id: string;
  student_id: string;
  academic_year: string;
  term: string;
  class_id: string | null;
  generated_at: string;
  generated_by: string | null;
  teacher_remarks: string | null;
  principal_remarks: string | null;
  status: "draft" | "published" | "archived";
  ai_narrative: string | null;
  ai_generated_at: string | null;
  ai_model_used: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  pdf_url: string | null;
  profiles: { full_name: string; email: string } | null;
  classes: { name: string; grade_level: string; stream: string } | null;
}

export function useJoyReports() {
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchReports = useCallback(async (filters?: { academic_year?: string; term?: string; class_id?: string; status?: string; student_id?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.academic_year) params.append("academic_year", filters.academic_year);
      if (filters?.term) params.append("term", filters.term);
      if (filters?.class_id) params.append("class_id", filters.class_id);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.student_id) params.append("student_id", filters.student_id);

      const data = await apiGet<{ reports: ReportCard[] }>(`/api/joy/reports?${params.toString()}`);
      setReports(data.reports);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const generateReport = useCallback(async (student_id: string, academic_year: string, term: string) => {
    setGenerating(true);
    try {
      const data = await apiPost<{
        success: boolean;
        reportId: string;
        narrative: string;
        subjectSummaries: Array<{ subjectId: string; subjectName: string; averagePercentage: number; assessmentCount: number }>;
        attendanceRate: number;
      }>("/api/joy/reports/generate", { student_id, academic_year, term });
      toast.success("Report generated successfully");
      return data;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const updateReport = useCallback(async (id: string, updates: { status?: "draft" | "published" | "archived"; teacher_remarks?: string; principal_remarks?: string; ai_narrative?: string }) => {
    try {
      const data = await apiPatch<{ success: boolean; report: ReportCard }>(`/api/joy/reports/${id}`, updates);
      toast.success(updates.status === "published" ? "Report published" : "Report updated");
      return data.report;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return null;
    }
  }, []);

  return { reports, loading, generating, fetchReports, generateReport, updateReport };
}
