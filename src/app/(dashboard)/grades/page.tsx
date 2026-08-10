"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { GraduationCap, Star, TrendingUp, Loader2 } from "lucide-react";

interface GradeRecord {
  id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  score: number | null;
  max_score: number | null;
  performance_level: string;
  term: string;
  academic_year: string;
  created_at: string;
}

export default function GradesPage() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) fetchGrades();
  }, [user]);

  async function fetchGrades() {
    try {
      setFetching(true);
      const res = await fetch("/api/grades");
      const data = await res.json();
      setGrades(data.grades || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }

  const avgScore = grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.length)
    : 0;

  const performanceColors: Record<string, string> = {
    excellent: "bg-green-100 text-green-700",
    good: "bg-blue-100 text-blue-700",
    average: "bg-yellow-100 text-yellow-700",
    below_average: "bg-orange-100 text-orange-700",
    poor: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grades</h1>
        <p className="text-gray-500">View academic performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Average Score</p>
          <p className="text-2xl font-bold text-blue-600">{avgScore}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Assessments</p>
          <p className="text-2xl font-bold text-gray-900">{grades.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Top Performance</p>
          <p className="text-2xl font-bold text-green-600">{grades.filter((g) => g.performance_level === "excellent").length}</p>
        </Card>
      </div>

      <Card className="p-6">
        {fetching ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : grades.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No grade records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Subject</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Score</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Max</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Performance</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Term</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900 font-medium">{g.subject_id}</td>
                    <td className="py-3 px-4 text-gray-900">{g.score ?? "—"}</td>
                    <td className="py-3 px-4 text-gray-600">{g.max_score ?? "—"}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${performanceColors[g.performance_level] || "bg-gray-100 text-gray-600"}`}>{g.performance_level.replace("_", " ")}</span></td>
                    <td className="py-3 px-4 text-gray-500">{g.term} · {g.academic_year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
