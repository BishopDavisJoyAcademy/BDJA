"use client";

export const dynamic = 'force-dynamic';

import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { BookOpen, Users, Calendar, GraduationCap, MessageSquare, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || "student";

  const stats = [
    { label: "Students", value: "--", icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Classes", value: "--", icon: BookOpen, color: "bg-green-100 text-green-600" },
    { label: "Events", value: "--", icon: Calendar, color: "bg-purple-100 text-purple-600" },
    { label: "Messages", value: "--", icon: MessageSquare, color: "bg-orange-100 text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-bdja-dark">Welcome back, {user?.full_name || "User"}</h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening at BDJA today</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-bdja-dark">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-bdja-dark mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-bdja-secondary" /> Quick Actions
          </h3>
          <div className="space-y-3">
            {role === "super_admin" && (
              <a href="/admin/setup" className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <p className="font-medium text-sm">Setup Super Admin</p>
                <p className="text-xs text-gray-500">Configure initial admin account</p>
              </a>
            )}
            {role === "super_admin" && (
              <a href="/admin/users" className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <p className="font-medium text-sm">Manage Users</p>
                <p className="text-xs text-gray-500">Add students, teachers, and staff</p>
              </a>
            )}
            <a href="/vora" className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <p className="font-medium text-sm">VORA Learning</p>
              <p className="text-xs text-gray-500">Browse educational videos</p>
            </a>
            <a href="/messages" className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <p className="font-medium text-sm">Messages</p>
              <p className="text-xs text-gray-500">View your inbox</p>
            </a>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-bdja-dark mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-bdja-primary" /> Upcoming Events
          </h3>
          <p className="text-sm text-gray-500">No upcoming events today.</p>
        </Card>
      </div>
    </div>
  );
}
