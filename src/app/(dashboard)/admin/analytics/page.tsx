"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Loader2, Users, GraduationCap, UserCheck, FileText } from "lucide-react";

interface AdminStats {
  students: number;
  staff: number;
  parents: number;
  pendingAdmissions: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AdminStats>({
    students: 0,
    staff: 0,
    parents: 0,
    pendingAdmissions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ students: number; staff: number; parents: number; pendingAdmissions: number }>("/api/admin/stats")
      .then((d) => {
        setStats({
          students: d.students || 0,
          staff: d.staff || 0,
          parents: d.parents || 0,
          pendingAdmissions: d.pendingAdmissions || 0,
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;
  if (error) return <div className="p-4 bg-red-500/10 text-red-400 rounded-xl">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <GraduationCap className="w-8 h-8 text-amber-400" />
            <div>
              <p className="text-sm text-gray-400">Students</p>
              <p className="text-2xl font-bold text-white">{stats.students}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Users className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-sm text-gray-400">Staff</p>
              <p className="text-2xl font-bold text-white">{stats.staff}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <UserCheck className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">Parents</p>
              <p className="text-2xl font-bold text-white">{stats.parents}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-sm text-gray-400">Pending Admissions</p>
              <p className="text-2xl font-bold text-white">{stats.pendingAdmissions}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
