"use client";

import { useState, useEffect, useCallback } from "react";
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
import { useRouter } from "next/navigation";

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
  { label: "Manage Staff", icon: Users, href: "/admin/staff", color: "text-blue-400 bg-blue-400/10" },
  { label: "Manage Students", icon: GraduationCap, href: "/admin/students", color: "text-emerald-400 bg-emerald-400/10" },
  { label: "Subjects", icon: BookOpen, href: "/admin/subjects", color: "text-amber-400 bg-amber-400/10" },
  { label: "Content", icon: FileText, href: "/admin/content", color: "text-purple-400 bg-purple-400/10" },
  { label: "VORA Videos", icon: Video, href: "/admin/vora", color: "text-rose-400 bg-rose-400/10" },
  { label: "Suggestions", icon: MessageSquare, href: "/admin/suggestions", color: "text-cyan-400 bg-cyan-400/10" },
  { label: "Platform Settings", icon: Settings, href: "/admin/settings", color: "text-gray-400 bg-gray-400/10" },
  { label: "God Mode", icon: Shield, href: "/admin/god-mode", color: "text-amber-400 bg-amber-400/10" },
];

export default function AdminDashboard() {
  const router = useRouter();
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

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
    { label: "Students", value: stats?.totalStudents ?? 0, icon: GraduationCap, color: "text-emerald-400", bg: "bg-emerald-400/10", growth: stats?.studentGrowth },
    { label: "Staff", value: stats?.totalStaff ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", growth: stats?.staffGrowth },
    { label: "Classes", value: stats?.totalClasses ?? 0, icon: BookOpen, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Subjects", value: stats?.totalSubjects ?? 0, icon: FileText, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: "Fees Collected", value: `KES ${(stats?.totalFeesCollected ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/10", growth: stats?.feeGrowth },
    { label: "Fees Pending", value: `KES ${(stats?.totalFeesPending ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-red-400", bg: "bg-red-400/10" },
    { label: "Events", value: stats?.totalEvents ?? 0, icon: Calendar, color: "text-cyan-400", bg: "bg-cyan-400/10" },
    { label: "Suggestions", value: stats?.totalSuggestions ?? 0, icon: MessageSquare, color: "text-rose-400", bg: "bg-rose-400/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Overview of Bishop Davis Joy Academy</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <Card key={card.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              {card.growth !== undefined && (
                <div className={`flex items-center gap-0.5 text-xs ${card.growth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {card.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(card.growth)}%
                </div>
              )}
            </div>
            <p className="text-xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-gray-500">{card.label}</p>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-gray-700/50 hover:bg-slate-800 hover:border-gray-600 transition-all text-left group"
            >
              <div className={`p-2 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                <action.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{action.label}</p>
                <ArrowRight className="w-3 h-3 text-gray-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Two Column: Recent Activity + Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              Recent Activity
            </h3>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.slice(0, 10).map((act) => (
                <div key={act.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-medium">{act.user_name || "System"}</span>{" "}
                      <span className="text-gray-400">{act.action}</span>{" "}
                      <span className="text-amber-400">{act.target}</span>
                    </p>
                    <p className="text-xs text-gray-500">{act.created_at ? new Date(act.created_at).toLocaleString() : ""}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </Card>

        {/* Upcoming Events */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Upcoming Events
            </h3>
            <Button size="sm" variant="ghost" onClick={() => router.push("/calendar")}>
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {stats?.upcomingEvents && stats.upcomingEvents.length > 0 ? (
              stats.upcomingEvents.map((evt) => (
                <div key={evt.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-gray-700/30">
                  <div className="text-center min-w-[48px]">
                    <p className="text-lg font-bold text-amber-400">{new Date(evt.date).getDate()}</p>
                    <p className="text-[10px] text-gray-500 uppercase">{new Date(evt.date).toLocaleString("default", { month: "short" })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{evt.title}</p>
                    <Badge variant="info" className="text-[10px]">{evt.type}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming events</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* System Health */}
      <Card className="p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          System Health
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "CMS Pages", value: stats?.totalCmsPages ?? 0, ok: (stats?.totalCmsPages ?? 0) > 0 },
            { label: "VORA Videos", value: stats?.totalVoraVideos ?? 0, ok: (stats?.totalVoraVideos ?? 0) > 0 },
            { label: "Students", value: stats?.totalStudents ?? 0, ok: (stats?.totalStudents ?? 0) > 0 },
            { label: "Staff", value: stats?.totalStaff ?? 0, ok: (stats?.totalStaff ?? 0) > 0 },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/30">
              {item.ok ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-white">{item.value}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
