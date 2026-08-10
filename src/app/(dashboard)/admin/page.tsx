"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Users, GraduationCap, DollarSign, ClipboardList, BookOpen, Calendar, MessageSquare, TrendingUp } from "lucide-react";
import Link from "next/link";
import { ADMIN_SEGMENT } from "@/lib/constants";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, staff: 0, parents: 0, pendingAdmissions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const cards = [
    { label: "Students", value: stats.students, icon: GraduationCap, href: `/${ADMIN_SEGMENT}/students`, color: "bg-blue-500" },
    { label: "Staff", value: stats.staff, icon: Users, href: `/${ADMIN_SEGMENT}/staff`, color: "bg-green-500" },
    { label: "Parents", value: stats.parents, icon: Users, href: "#", color: "bg-purple-500" },
    { label: "Pending Admissions", value: stats.pendingAdmissions, icon: ClipboardList, href: "/admissions", color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Welcome back, {user?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? "..." : card.value}</p>
                </div>
                <div className={`${card.color} text-white p-3 rounded-lg`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link href={`/${ADMIN_SEGMENT}/staff/create`} className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700">
              + Add New Staff Member
            </Link>
            <Link href={`/${ADMIN_SEGMENT}/students/create`} className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700">
              + Add New Student
            </Link>
            <Link href={`/${ADMIN_SEGMENT}/pages`} className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700">
              + Edit CMS Pages
            </Link>
            <Link href="/manage/calendar" className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700">
              + Add Calendar Event
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Platform Overview</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span>Manage subjects, classes, and curriculum</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-500" />
              <span>Schedule events and manage timetables</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-purple-500" />
              <span>Track fee payments and financial records</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              <span>Communicate with parents and staff</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
