"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Loader2, GraduationCap, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

interface Grade {
  id: string;
  subject_id: string;
  term: string;
  academic_year: string;
  score: number;
  max_score: number;
  grade_level: string;
  remarks?: string;
  subjects?: { name: string };
}

export default function ParentGradesPage() {
  const searchParams = useSearchParams();
  const childId = searchParams.get("child");
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState("");

  useEffect(() => {
    if (!childId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/parent/grades?child=${childId}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setGrades(data.grades || []);
          setChildName(data.child_name || "");
        } else throw new Error(data.error);
      } catch (err: any) {
        if (!cancelled) toast.error(err.message || "Failed to load grades");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [childId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-bdja-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/parent" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-bdja-primary" />
            Academic Reports
          </h1>
          <p className="text-sm text-gray-500">{childName}</p>
        </div>
      </div>

      {grades.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <p className="text-gray-500">No grades available yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {grades.map((grade) => (
            <Card key={grade.id} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{grade.subjects?.name || "Subject"}</h3>
                  <p className="text-sm text-gray-500">{grade.term} {grade.academic_year}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-bdja-primary">
                    {grade.score}/{grade.max_score}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.round((grade.score / grade.max_score) * 100)}%
                  </p>
                </div>
              </div>
              {grade.remarks && (
                <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{grade.remarks}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
