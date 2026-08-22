"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2, Users, GraduationCap, UserCheck, FileText, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ADMIN_SEGMENT } from "@/lib/constants";

interface AnalyticsData {
  students: number;
  staff: number;
  parents: number;
  pendingAdmissions: number;
  totalFeesCollected: number;
  totalFeesPending: number;
  totalEvents: number;
  totalSuggestions: number;
  studentGrowth: number;
  staffGrowth: number;
  feeGrowth: number;
  recentActivity: Array<{
    id: string;
    action: string;
    target: string;
    created_at: string;
    user_name?: string;
  }>;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<AnalyticsData>("/api/admin/stats");
      setStats(data);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium">Failed to load analytics</span>
        </div>
        <p className="text-sm">{error}</p>
        <Button onClick={fetchStats} className="mt-3" size="sm">
          <RefreshCw className="w-3 h-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  const cards = [
    { label: "Students", value: stats?.students ?? 0, icon: GraduationCap, color: "text-emerald-400", bg: "bg-emerald-400/10", growth: stats?.studentGrowth, href: `/${ADMIN_SEGMENT}/students` },
    { label: "Staff", value: stats?.staff ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", growth: stats?.staffGrowth, href: `/${ADMIN_SEGMENT}/staff` },
    { label: "Parents", value: stats?.parents ?? 0, icon: UserCheck, color: "text-cyan-400", bg: "bg-cyan-400/10", href: `/${ADMIN_SEGMENT}/students` },
    { label: "Pending Admissions", value: stats?.pendingAdmissions ?? 0, icon: FileText, color: "text-purple-400", bg: "bg-purple-400/10", href: "/manage/admissions" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="block">
            <Card className="p-6 hover:bg-slate-800/80 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-400">{card.label}</p>
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                  {card.growth !== undefined && (
                    <div className={`flex items-center gap-1 text-xs ${card.growth > 0 ? "text-emerald-400" : card.growth < 0 ? "text-red-400" : "text-gray-400"}`}>
                      {card.growth > 0 ? <TrendingUp className="w-3 h-3" /> : card.growth < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {card.growth > 0 ? "+" : ""}{card.growth}%
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {stats.recentActivity.slice(0, 10).map((act) => (
              <div key={act.id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                <div>
                  <p className="text-sm text-white">{act.action} <span className="text-gray-400">{act.target}</span></p>
                  <p className="text-xs text-gray-500">{act.user_name || "System"}</p>
                </div>
                <span className="text-xs text-gray-500">{new Date(act.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
