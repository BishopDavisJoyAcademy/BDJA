"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Users, GraduationCap, BookOpen, ClipboardList } from "lucide-react";
import { apiGet } from "@/lib/api-client";

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ students: 0, staff: 0, parents: 0, pendingAdmissions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/api/admin/stats").then((d) => { setStats(d); setLoading(false); }).catch((err) => { setError(getErrorMessage(err)); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div></div>;
  if (error) return <div className="p-4 bg-red-500/10 text-red-400 rounded-xl flex items-center gap-2 border border-red-500/20"><AlertCircle className="w-5 h-5" />{error}</div>;

  const cards = [
    { label: "Total Students", value: stats.students, icon: GraduationCap, color: "from-blue-500 to-blue-600" },
    { label: "Total Staff", value: stats.staff, icon: Users, color: "from-emerald-500 to-emerald-600" },
    { label: "Total Parents", value: stats.parents, icon: Users, color: "from-violet-500 to-violet-600" },
    { label: "Pending Admissions", value: stats.pendingAdmissions, icon: ClipboardList, color: "from-amber-500 to-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-white">Analytics & Reports</h1><p className="text-gray-400 mt-1">Platform overview and key metrics</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-gray-400">{card.label}</p><p className="text-3xl font-bold text-white mt-1">{card.value}</p></div>
                <div className={`bg-gradient-to-br ${card.color} text-white p-3 rounded-xl shadow-lg`}><Icon className="w-6 h-6" /></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
