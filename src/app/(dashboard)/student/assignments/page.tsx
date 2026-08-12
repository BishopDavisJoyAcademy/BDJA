"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { BookOpen, Calendar, AlertCircle, Loader2 } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  subject_name?: string;
  status: string;
}

export default function StudentAssignmentsPage() {
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
      } catch (err: any) {
        setError(err.message || "Could not load assignments");
      } finally {
        setLoading(false);
      }
    }
    fetchAssignments();
  }, []);

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();
  const daysUntil = (dueDate: string) => {
    const diff = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

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
          <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
          <p className="text-gray-500">View and track your assignments</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
          <BookOpen className="w-5 h-5" />
          <span className="font-medium">{assignments.length} Total</span>
        </div>
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
          <h3 className="text-lg font-medium text-gray-900">No assignments found</h3>
          <p className="text-gray-400 mt-1">You're all caught up! Check back later for new assignments.</p>
        </div>
      )}

      <div className="grid gap-4">
        {assignments.map((assignment) => {
          const overdue = isOverdue(assignment.due_date);
          const days = daysUntil(assignment.due_date);
          return (
            <div
              key={assignment.id}
              className={`bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow ${
                overdue ? "border-red-200" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                    overdue ? "bg-red-100 text-red-600" : days <= 2 ? "bg-yellow-100 text-yellow-600" : "bg-blue-100 text-blue-600"
                  }`}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{assignment.description}</p>
                    {assignment.subject_name && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-medium">
                        {assignment.subject_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    overdue ? "text-red-600" : days <= 2 ? "text-yellow-600" : "text-gray-500"
                  }`}>
                    <Calendar className="w-4 h-4" />
                    <span>
                      {overdue ? "Overdue" : days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `${days} days left`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{new Date(assignment.due_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
