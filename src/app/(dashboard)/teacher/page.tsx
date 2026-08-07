"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Users, PenLine, ClipboardList, Calendar } from "lucide-react";
import Link from "next/link";

export default function TeacherDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.user_category !== "staff" && user?.user_category !== "admin") {
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

  if (user?.user_category !== "staff" && user?.user_category !== "admin") return null;

  const tools = [
    { label: "My Classes", href: "/teacher", icon: Users, desc: "View your assigned classes" },
    { label: "Mark Sheets", href: "/teacher/marks", icon: PenLine, desc: "Enter student grades" },
    { label: "Attendance", href: "/teacher/registers", icon: ClipboardList, desc: "Mark daily attendance" },
    { label: "Timetables", href: "/teacher/timetables", icon: Calendar, desc: "Manage your schedule" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Portal</h1>
        <p className="text-gray-500">Welcome back, {user?.full_name}</p>
        {user?.designation && (
          <p className="text-sm text-bdja-primary">{user.designation}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-bdja-primary/10 rounded-lg">
                  <tool.icon className="w-6 h-6 text-bdja-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{tool.label}</h3>
                  <p className="text-sm text-gray-500">{tool.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
