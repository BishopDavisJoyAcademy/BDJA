"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { BookOpen, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

interface Admission {
  id: string;
  student_name: string;
  parent_name: string | null;
  email: string | null;
  phone: string | null;
  grade_level: string;
  status: string;
  submitted_at: string | null;
  notes: string | null;
}

export default function AdmissionsManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!loading && user?.user_category !== "staff" && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.user_category === "staff" || user?.user_category === "admin") {
      fetchAdmissions();
    }
  }, [user]);

  async function fetchAdmissions() {
    try {
      setFetching(true);
      const res = await fetch("/api/admissions");
      const data = await res.json();
      setAdmissions(data.admissions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/admissions?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchAdmissions();
    } catch (err) {
      alert("Failed to update status");
    }
  }

  const filtered = filter === "all" ? admissions : admissions.filter((a) => a.status === filter);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    enrolled: "bg-blue-100 text-blue-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-bdja-primary animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "staff" && user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admissions Management</h1>
        <p className="text-gray-500">Review and process admission applications</p>
      </div>

      <div className="flex gap-2">
        {["all", "pending", "approved", "rejected", "enrolled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <Card className="p-6">
        {fetching ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No applications found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <div key={a.id} className="flex items-start justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{a.student_name}</h4>
                    <p className="text-xs text-gray-500">Grade {a.grade_level} · {a.parent_name || "No parent name"}</p>
                    {a.email && <p className="text-xs text-gray-400">{a.email} · {a.phone}</p>}
                    {a.notes && <p className="text-xs text-gray-400 mt-1 italic">{a.notes}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[a.status] || "bg-gray-100 text-gray-600"}`}>{a.status}</span>
                  {a.status === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => updateStatus(a.id, "approved")} className="p-1 text-green-600 hover:bg-green-50 rounded"><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={() => updateStatus(a.id, "rejected")} className="p-1 text-red-600 hover:bg-red-50 rounded"><XCircle className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
