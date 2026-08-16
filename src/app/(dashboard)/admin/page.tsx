"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Users, GraduationCap, ClipboardList, BookOpen, Calendar, MessageSquare, Plus, FileText } from "lucide-react";
import Link from "next/link";
import { ADMIN_SEGMENT } from "@/lib/constants";
import { apiGet } from "@/lib/api-client";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, staff: 0, parents: 0, pendingAdmissions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/api/admin/stats")
      .then((data) => setStats(data))
      .catch((err) => console.error("Stats error:", err))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Students", value: stats.students, icon: GraduationCap, href: `/${ADMIN_SEGMENT}/students`, color: "from-blue-500 to-blue-600" },
    { label: "Staff", value: stats.staff, icon: Users, href: `/${ADMIN_SEGMENT}/staff`, color: "from-emerald-500 to-emerald-600" },
    { label: "Parents", value: stats.parents, icon: Users, href: `/${ADMIN_SEGMENT}/users`, color: "from-violet-500 to-violet-600" },
    { label: "Pending Admissions", value: stats.pendingAdmissions, icon: ClipboardList, href: "/admissions", color: "from-amber-500 to-amber-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back, {user?.full_name}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="group relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-slate-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{card.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{loading ? "—" : card.value}</p>
                </div>
                <div className={`bg-gradient-to-br ${card.color} text-white p-3 rounded-xl shadow-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href={`/${ADMIN_SEGMENT}/staff/create`} className="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700/30 hover:border-slate-600 transition-all text-sm font-medium text-gray-200">
              <Plus className="w-4 h-4 text-emerald-400" /> Add New Staff Member
            </Link>
            <Link href={`/${ADMIN_SEGMENT}/students/create`} className="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700/30 hover:border-slate-600 transition-all text-sm font-medium text-gray-200">
              <Plus className="w-4 h-4 text-blue-400" /> Add New Student
            </Link>
            <Link href={`/${ADMIN_SEGMENT}/pages`} className="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700/30 hover:border-slate-600 transition-all text-sm font-medium text-gray-200">
              <FileText className="w-4 h-4 text-violet-400" /> Edit CMS Pages
            </Link>
            <Link href="/manage/calendar" className="flex items-center gap-3 p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700/30 hover:border-slate-600 transition-all text-sm font-medium text-gray-200">
              <Calendar className="w-4 h-4 text-amber-400" /> Add Calendar Event
            </Link>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">Platform Overview</h3>
          <div className="space-y-4 text-sm text-gray-400">
            <div className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-blue-400" /><span>Manage subjects, classes, and curriculum</span></div>
            <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-emerald-400" /><span>Schedule events and manage timetables</span></div>
            <div className="flex items-center gap-3"><MessageSquare className="w-5 h-5 text-violet-400" /><span>Communicate with parents and staff</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
