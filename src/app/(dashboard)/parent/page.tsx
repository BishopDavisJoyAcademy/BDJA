"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { ClipboardList, DollarSign, Users, Calendar } from "lucide-react";

export default function ParentDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
        <p className="text-gray-500">Welcome back, {user?.full_name}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Child Grades", icon: ClipboardList, href: "/parent/grades", color: "bg-blue-500" },
          { label: "Fee Payments", icon: DollarSign, href: "/parent/fees", color: "bg-green-500" },
          { label: "Attendance", icon: Users, href: "/parent/attendance", color: "bg-purple-500" },
          { label: "Calendar", icon: Calendar, href: "/calendar", color: "bg-orange-500" },
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
