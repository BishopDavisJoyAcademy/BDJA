"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Users, GraduationCap, BookOpen, DollarSign } from "lucide-react";

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ students: 0, staff: 0, parents: 0, pendingAdmissions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2"><AlertCircle className="w-5 h-5" />{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: stats.students, icon: GraduationCap, color: "bg-blue-500" },
          { label: "Total Staff", value: stats.staff, icon: Users, color: "bg-green-500" },
          { label: "Total Parents", value: stats.parents, icon: Users, color: "bg-purple-500" },
          { label: "Pending Admissions", value: stats.pendingAdmissions, icon: BookOpen, color: "bg-orange-500" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`${card.color} text-white p-3 rounded-lg`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
