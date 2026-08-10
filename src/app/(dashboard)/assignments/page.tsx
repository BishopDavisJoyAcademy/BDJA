"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ClipboardList, Calendar, BookOpen, Loader2 } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  subject_id: string;
  class_id: string;
  status: string | null;
  created_at: string | null;
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) fetchAssignments();
  }, [user]);

  async function fetchAssignments() {
    try {
      setFetching(true);
      const res = await fetch("/api/assignments");
      const data = await res.json();
      setAssignments(data.assignments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "No due date";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    draft: "bg-gray-100 text-gray-600",
    closed: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <p className="text-gray-500">View and manage your assignments</p>
      </div>

      <Card className="p-6">
        {fetching ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No assignments yet.</div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <div key={a.id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{a.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{a.description || "No description"}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Due {formatDate(a.due_date)}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1"><BookOpen className="w-3 h-3" /> {a.class_id}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[a.status || "draft"]}`}>{a.status || "draft"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
