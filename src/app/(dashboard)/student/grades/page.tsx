"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { ClipboardList, TrendingUp, Award, BookOpen, Loader2, AlertCircle } from "lucide-react";

interface Grade {
  id: string;
  subject_id: string;
  subject_name?: string;
  score: number;
  max_score: number;
  term: string;
  academic_year: string;
  performance_level: string;
  strand: string;
  sub_strand: string;
}

export default function StudentGradesPage() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchGrades() {
      try {
        const res = await fetch("/api/grades");
        if (!res.ok) throw new Error("Failed to fetch grades");
        const data = await res.json();
        setGrades(data.grades || data.assessments || []);
      } catch (err: any) {
        setError(err.message || "Could not load grades");
      } finally {
        setLoading(false);
      }
    }
    fetchGrades();
  }, []);

  const getPerformanceColor = (level: string) => {
    switch (level) {
      case "exceeding": return "text-green-600 bg-green-50 border-green-200";
      case "meeting": return "text-blue-600 bg-blue-50 border-blue-200";
      case "approaching": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "below": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const avgScore = grades.length > 0
    ? Math.round((grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.reduce((sum, g) => sum + (g.max_score || 1), 0)) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Grades</h1>
          <p className="text-gray-500">View your academic performance</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
            <Award className="w-5 h-5" />
            <span className="font-medium">{grades.length} Assessments</span>
          </div>
          {grades.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">{avgScore}% Average</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {grades.length === 0 && !error && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <ClipboardList className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No grades recorded yet</h3>
          <p className="text-gray-400 mt-1">Your grades will appear here once your teachers enter them.</p>
        </div>
      )}

      <div className="grid gap-4">
        {grades.map((grade) => (
          <div key={grade.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{grade.subject_name || grade.subject_id}</h3>
                  <p className="text-sm text-gray-500">{grade.strand} — {grade.sub_strand}</p>
                  <p className="text-xs text-gray-400 mt-1">{grade.term} · {grade.academic_year}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-2xl font-bold text-gray-900">
                    {grade.score ?? "—"}<span className="text-sm text-gray-400 font-normal">/{grade.max_score}</span>
                  </span>
                </div>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium capitalize border ${getPerformanceColor(grade.performance_level)}`}>
                  {grade.performance_level}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
