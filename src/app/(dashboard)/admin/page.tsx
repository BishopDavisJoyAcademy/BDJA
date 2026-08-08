"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Users, GraduationCap, UserCheck, BookOpen, Video, FileText, Calendar } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "admin") return null;

  const stats = [
    { label: "Total Students", value: 0, icon: GraduationCap, href: "/admin/students" },
    { label: "Total Staff", value: 0, icon: Users, href: "/admin/staff" },
    { label: "Total Parents", value: 0, icon: UserCheck, href: "/admin/users" },
    { label: "VORA Content", value: 0, icon: Video, href: "/admin/vora" },
    { label: "CMS Pages", value: 0, icon: FileText, href: "/admin/pages" },
    { label: "Calendar Events", value: 0, icon: Calendar, href: "/manage/calendar" },
    { label: "Pending Admissions", value: 0, icon: BookOpen, href: "/manage/admissions" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Welcome back, {user?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    <AnimatedCounter value={stat.value} />
                  </p>
                </div>
                <stat.icon className="w-8 h-8 text-bdja-primary opacity-50" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/admin/staff/create" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <p className="font-medium text-gray-900">Add Staff Member</p>
              <p className="text-sm text-gray-500">Create a new staff account with permissions</p>
            </Link>
            <Link href="/admin/vora" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <p className="font-medium text-gray-900">Manage VORA Content</p>
              <p className="text-sm text-gray-500">Add, edit, or remove learning videos</p>
            </Link>
            <Link href="/admin/pages" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <p className="font-medium text-gray-900">CMS Pages</p>
              <p className="text-sm text-gray-500">Manage website content and pages</p>
            </Link>
            <Link href="/manage/calendar" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <p className="font-medium text-gray-900">School Calendar</p>
              <p className="text-sm text-gray-500">Add or edit events and holidays</p>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Authentication</span>
              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Storage</span>
              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Ready</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Joy AI</span>
              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Online</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
