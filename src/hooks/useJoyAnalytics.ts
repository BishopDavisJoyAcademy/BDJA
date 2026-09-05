"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

export interface AtRiskStudent {
  studentId: string;
  studentName: string;
  className: string;
  currentAverage: number;
  previousAverage: number;
  trend: "improving" | "declining" | "stable";
  riskScore: number;
  weakSubjects: string[];
  recommendation: string;
}

export interface ClassAverage {
  classId: string;
  className: string;
  averageScore: number;
  studentCount: number;
  topSubject: string;
  weakestSubject: string;
}

export interface SubjectPerformance {
  subjectId: string;
  subjectName: string;
  averageScore: number;
  studentCount: number;
  performanceDistribution: Record<string, number>;
}

export interface GradeAnalytics {
  atRiskStudents: AtRiskStudent[];
  classAverages: ClassAverage[];
  subjectPerformance: SubjectPerformance[];
  overallStats: {
    totalAssessments: number;
    averageScore: number;
    passRate: number;
    atRiskCount: number;
  };
}

export interface AttendanceSummary {
  totalRecords: number;
  presentRate: number;
  absentRate: number;
  lateRate: number;
  excusedRate: number;
}

export interface FrequentAbsentee {
  studentId: string;
  studentName: string;
  className: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
  trend: "improving" | "declining" | "stable";
  riskLevel: "low" | "medium" | "high";
  recommendation: string;
}

export interface ClassAttendance {
  classId: string;
  className: string;
  presentRate: number;
  absentRate: number;
  lateRate: number;
  studentCount: number;
}

export interface DailyTrend {
  date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export interface GradeCorrelation {
  studentId: string;
  studentName: string;
  attendanceRate: number;
  averageGrade: number;
  correlation: "positive" | "negative" | "neutral";
}

export interface AttendanceAnalytics {
  summary: AttendanceSummary;
  frequentAbsentees: FrequentAbsentee[];
  classAttendance: ClassAttendance[];
  dailyTrend: DailyTrend[];
  gradeCorrelation: GradeCorrelation[];
}

export interface Anomaly {
  id: string;
  type: "grade_drop" | "grade_jump" | "attendance_spike" | "data_error" | "unusual_pattern";
  severity: "low" | "medium" | "high" | "critical";
  studentId: string;
  studentName: string;
  className: string;
  description: string;
  details: string;
  detectedAt: string;
  recommendedAction: string;
}

interface UseJoyAnalyticsReturn {
  gradeAnalytics: GradeAnalytics | null;
  attendanceAnalytics: AttendanceAnalytics | null;
  anomalies: Anomaly[];
  loading: boolean;
  error: string | null;
  fetchGradeAnalytics: (params?: { class_id?: string; term?: string; academic_year?: string }) => Promise<void>;
  fetchAttendanceAnalytics: (params?: { class_id?: string; days?: number }) => Promise<void>;
  fetchAnomalies: () => Promise<void>;
}

export function useJoyAnalytics(): UseJoyAnalyticsReturn {
  const [gradeAnalytics, setGradeAnalytics] = useState<GradeAnalytics | null>(null);
  const [attendanceAnalytics, setAttendanceAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = useCallback(async () => {
    const { data: { session: s } } = await import("@/lib/supabase").then((m) => m.supabase.auth.getSession());
    const headers: Record<string, string> = {};
    if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
    return headers;
  }, []);

  const fetchGradeAnalytics = useCallback(async (params?: { class_id?: string; term?: string; academic_year?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const url = new URL("/api/joy/analytics/grades", window.location.origin);
      if (params?.class_id) url.searchParams.set("class_id", params.class_id);
      if (params?.term) url.searchParams.set("term", params.term);
      if (params?.academic_year) url.searchParams.set("academic_year", params.academic_year);

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGradeAnalytics(data as GradeAnalytics);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const fetchAttendanceAnalytics = useCallback(async (params?: { class_id?: string; days?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const url = new URL("/api/joy/analytics/attendance", window.location.origin);
      if (params?.class_id) url.searchParams.set("class_id", params.class_id);
      if (params?.days) url.searchParams.set("days", String(params.days));

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAttendanceAnalytics(data as AttendanceAnalytics);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/joy/analytics/anomalies", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAnomalies((data.anomalies || []) as Anomaly[]);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  return {
    gradeAnalytics,
    attendanceAnalytics,
    anomalies,
    loading,
    error,
    fetchGradeAnalytics,
    fetchAttendanceAnalytics,
    fetchAnomalies,
  };
}
