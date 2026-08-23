"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { BookOpen, Plus, Calendar, Users, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getErrorMessage } from "@/lib/errors";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  class_id: string;
  subject_id: string;
  status: string;
}

export default function TeacherAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch("/api/assignments");
        if (!res.ok) throw new Error("Failed to fetch assignments");
        const data = await res.json();
        setAssignments(data.assignments || []);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Could not load assignments");
      } finally {
        setLoading(false);
      }
    }
    fetchAssignments();
  }, []);

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
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-500">Manage and track student assignments</p>
        </div>
        <Link
          href="/teacher/assignments/create"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Assignment
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {assignments.length === 0 && !error && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No assignments created yet</h3>
          <p className="text-gray-400 mt-1">Click "Create Assignment" to get started.</p>
        </div>
      )}

      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <div key={assignment.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{assignment.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Due {new Date(assignment.due_date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Class {assignment.class_id?.slice(0, 8)}
                    </span>
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                assignment.status === "active"
                  ? "bg-green-50 text-green-600"
                  : assignment.status === "draft"
                  ? "bg-yellow-50 text-yellow-600"
                  : "bg-gray-50 text-gray-600"
              }`}>
                {assignment.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
