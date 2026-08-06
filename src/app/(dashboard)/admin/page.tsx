"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  Users, GraduationCap, Shield, BookOpen, Wallet, Calendar,
  BarChart3, Activity, TrendingUp, TrendingDown, Plus
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Stats {
  totalStudents: number;
  totalStaff: number;
  totalParents: number;
  pendingAdmissions: number;
  pendingPayments: number;
  totalAnnouncements: number;
  recentLogins: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0, totalStaff: 0, totalParents: 0,
    pendingAdmissions: 0, pendingPayments: 0, totalAnnouncements: 0, recentLogins: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) {
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "Add Staff", href: "/admin/staff/create", icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Add Student", href: "/admin/students/create", icon: GraduationCap, color: "bg-green-100 text-green-600" },
    { label: "Broadcast", href: "/admin/announcements", icon: Shield, color: "bg-purple-100 text-purple-600" },
    { label: "View Analytics", href: "/admin/analytics", icon: BarChart3, color: "bg-orange-100 text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.full_name || "Administrator"}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                <action.icon className="w-5 h-5" />
              </div>
              <p className="font-medium text-gray-900 mt-2 text-sm">{action.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStudents}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStaff}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Parents</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalParents}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Admissions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingAdmissions}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingPayments}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Recent Logins (24h)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.recentLogins}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Management Links */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Management</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link href="/admin/staff" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">Staff Management</span>
          </Link>
          <Link href="/admin/students" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border">
            <GraduationCap className="w-5 h-5 text-green-600" />
            <span className="font-medium text-gray-900">Student Management</span>
          </Link>
          <Link href="/admin/analytics" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-gray-900">Analytics</span>
          </Link>
          <Link href="/admin/audit" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border">
            <Shield className="w-5 h-5 text-red-600" />
            <span className="font-medium text-gray-900">Audit Logs</span>
          </Link>
          <Link href="/admin/pages" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">CMS Pages</span>
          </Link>
          <Link href="/admin/campuses" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span className="font-medium text-gray-900">Campuses</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
