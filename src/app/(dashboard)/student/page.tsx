"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { GraduationCap, Calendar, BookOpen, Video } from "lucide-react";
import Link from "next/link";

export default function StudentDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.user_category !== "student") {
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

  if (user?.user_category !== "student") return null;

  const quickLinks = [
    { label: "My Grades", href: "/grades", icon: GraduationCap, desc: "View your academic performance" },
    { label: "Timetable", href: "/timetable", icon: Calendar, desc: "Check your class schedule" },
    { label: "Assignments", href: "/assignments", icon: BookOpen, desc: "View pending assignments" },
    { label: "VORA Learning", href: "/vora", icon: Video, desc: "Access learning videos" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Portal</h1>
        <p className="text-gray-500">Welcome back, {user?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-bdja-primary/10 rounded-lg">
                  <link.icon className="w-6 h-6 text-bdja-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{link.label}</h3>
                  <p className="text-sm text-gray-500">{link.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
