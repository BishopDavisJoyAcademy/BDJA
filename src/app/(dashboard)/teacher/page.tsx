"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { ClipboardList, Users, Calendar, BookOpen } from "lucide-react";

export default function TeacherDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-gray-500">Welcome back, {user?.full_name}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Enter Grades", icon: ClipboardList, href: "/teacher/marks", color: "bg-blue-500" },
          { label: "Attendance", icon: Users, href: "/teacher/registers", color: "bg-green-500" },
          { label: "Timetable", icon: Calendar, href: "/teacher/timetables", color: "bg-purple-500" },
          { label: "Assignments", icon: BookOpen, href: "/teacher/assignments", color: "bg-orange-500" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className={`${card.color} text-white p-3 rounded-lg w-fit mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="font-medium text-gray-900">{card.label}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
