"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Users, GraduationCap, UserCheck, BookOpen } from "lucide-react";
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
                <stat.icon className="w-8 h-8 text-bdja-primary" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/staff/create" className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm font-medium text-center">
              Add Staff
            </Link>
            <Link href="/admin/students/create" className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm font-medium text-center">
              Add Student
            </Link>
            <Link href="/admin/pages" className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm font-medium text-center">
              Edit Pages
            </Link>
            <Link href="/admin/analytics" className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm font-medium text-center">
              Analytics
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">System Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Platform Version</span>
              <span className="font-medium">5.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Role System</span>
              <span className="font-medium text-green-600">Ghost-Free</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Permissions</span>
              <span className="font-medium text-green-600">Database-Driven</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
