"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Loader2, Users, GraduationCap, BookOpen, DollarSign, Calendar,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock,
  ArrowRight, RefreshCw, MessageSquare, Video, FileText, Settings,
  Shield, Activity
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { ADMIN_SEGMENT } from "@/lib/constants";

interface DashboardStats {
  totalStudents: number;
  totalStaff: number;
  totalClasses: number;
  totalSubjects: number;
  totalFeesCollected: number;
  totalFeesPending: number;
  totalEvents: number;
  totalSuggestions: number;
  totalVoraVideos: number;
  totalCmsPages: number;
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
  upcomingEvents: Array<{
    id: string;
    title: string;
    date: string;
    type: string;
  }>;
}

const QUICK_ACTIONS = [
  { label: "Manage Staff", icon: Users, href: `/${ADMIN_SEGMENT}/staff`, color: "text-blue-400 bg-blue-400/10" },
  { label: "Manage Students", icon: GraduationCap, href: `/${ADMIN_SEGMENT}/students`, color: "text-emerald-400 bg-emerald-400/10" },
  { label: "Subjects", icon: BookOpen, href: `/${ADMIN_SEGMENT}/subjects`, color: "text-amber-400 bg-amber-400/10" },
  { label: "Content", icon: FileText, href: `/${ADMIN_SEGMENT}/content`, color: "text-purple-400 bg-purple-400/10" },
  { label: "VORA Videos", icon: Video, href: `/${ADMIN_SEGMENT}/vora`, color: "text-rose-400 bg-rose-400/10" },
  { label: "Suggestions", icon: MessageSquare, href: `/${ADMIN_SEGMENT}/suggestions`, color: "text-cyan-400 bg-cyan-400/10" },
  { label: "Platform Settings", icon: Settings, href: `/${ADMIN_SEGMENT}/settings`, color: "text-gray-400 bg-gray-400/10" },
  { label: "God Mode", icon: Shield, href: `/${ADMIN_SEGMENT}/god-mode`, color: "text-amber-400 bg-amber-400/10" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<DashboardStats>("/api/admin/stats");
      setStats(data);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

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
          <AlertTriangle className="w-4 h-4" />
          <span className="font-medium">Failed to load dashboard</span>
        </div>
        <p className="text-sm">{error}</p>
        <Button onClick={fetchStats} className="mt-3" size="sm">
          <RefreshCw className="w-3 h-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  const statCards = [
    { label: "Students", value: stats?.totalStudents ?? 0, icon: GraduationCap, color: "text-emerald-400", bg: "bg-emerald-400/10", growth: stats?.studentGrowth, href: `/${ADMIN_SEGMENT}/students` },
    { label: "Staff", value: stats?.totalStaff ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", growth: stats?.staffGrowth, href: `/${ADMIN_SEGMENT}/staff` },
    { label: "Classes", value: stats?.totalClasses ?? 0, icon: BookOpen, color: "text-amber-400", bg: "bg-amber-400/10", href: `/${ADMIN_SEGMENT}/subjects` },
    { label: "Subjects", value: stats?.totalSubjects ?? 0, icon: FileText, color: "text-purple-400", bg: "bg-purple-400/10", href: `/${ADMIN_SEGMENT}/subjects` },
    { label: "Fees Collected", value: `KES ${(stats?.totalFeesCollected ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/10", growth: stats?.feeGrowth, href: "/fees" },
    { label: "Fees Pending", value: `KES ${(stats?.totalFeesPending ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-red-400", bg: "bg-red-400/10", href: "/fees" },
    { label: "Events", value: stats?.totalEvents ?? 0, icon: Calendar, color: "text-cyan-400", bg: "bg-cyan-400/10", href: "/manage/calendar" },
    { label: "Suggestions", value: stats?.totalSuggestions ?? 0, icon: MessageSquare, color: "text-rose-400", bg: "bg-rose-400/10", href: `/${ADMIN_SEGMENT}/suggestions` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Overview of Bishop Davis Joy Academy</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href} className="block">
            <Card className="p-5 hover:bg-slate-800/80 transition-colors cursor-pointer h-full">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                {card.growth !== undefined && (
                  <Badge className={`text-xs ${card.growth >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {card.growth >= 0 ? "+" : ""}{card.growth}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-sm text-gray-400">{card.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" /> Recent Activity
            </h2>
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.slice(0, 8).map((act) => (
                  <div key={act.id} className="flex items-start gap-3 py-2 border-b border-gray-700/50 last:border-0">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{act.action} <span className="text-gray-400">{act.target}</span></p>
                      <p className="text-xs text-gray-500">{act.user_name || "System"} · {new Date(act.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No recent activity.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" /> Upcoming Events
            </h2>
            {stats?.upcomingEvents && stats.upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingEvents.slice(0, 5).map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                    <div>
                      <p className="text-sm text-white">{evt.title}</p>
                      <p className="text-xs text-gray-500">{new Date(evt.date).toLocaleDateString()}</p>
                    </div>
                    <Badge className="bg-slate-700 text-gray-300 text-xs">{evt.type}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No upcoming events.</p>
            )}
          </Card>
        </div>

        <div>
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center`}>
                    <action.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-gray-300 group-hover:text-white flex-1">{action.label}</span>
                  <ArrowRight className="w-3 h-3 text-gray-500 group-hover:text-gray-300" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
