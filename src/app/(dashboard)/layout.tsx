"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { usePermissionStore } from "@/stores/permissions";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { School, LogOut, LayoutDashboard, Users, BookOpen, Calendar, MessageSquare, Bell, Settings, Shield, GraduationCap, Library, FileText, DollarSign, ClipboardList, HelpCircle, Menu, X } from "lucide-react";

const ADMIN_SEGMENT = process.env.NEXT_PUBLIC_ADMIN_SEGMENT || "admin";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const { fetchPermissions } = usePermissionStore();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useInactivityLogout();

  useEffect(() => {
    if (user) fetchPermissions();
  }, [user, fetchPermissions]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.user_category === "admin";
  const isStaff = user.user_category === "staff";
  const isStudent = user.user_category === "student";
  const isParent = user.user_category === "parent";

  const navItems: { href: string; label: string; icon: React.ElementType }[] = [];

  if (isAdmin) {
    navItems.push(
      { href: `/${ADMIN_SEGMENT}`, label: "Dashboard", icon: LayoutDashboard },
      { href: `/${ADMIN_SEGMENT}/staff`, label: "Staff", icon: Users },
      { href: `/${ADMIN_SEGMENT}/students`, label: "Students", icon: GraduationCap },
      { href: `/${ADMIN_SEGMENT}/pages`, label: "CMS Pages", icon: FileText },
      { href: `/${ADMIN_SEGMENT}/suggestions`, label: "Suggestions", icon: HelpCircle },
      { href: `/${ADMIN_SEGMENT}/analytics`, label: "Analytics", icon: Shield },
    );
  }

  if (isStaff) {
    navItems.push(
      { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
      { href: "/teacher/marks", label: "Grades", icon: ClipboardList },
      { href: "/teacher/registers", label: "Attendance", icon: Users },
      { href: "/teacher/timetables", label: "Timetable", icon: Calendar },
      { href: "/teacher/assignments", label: "Assignments", icon: BookOpen },
    );
  }

  if (isStudent) {
    navItems.push(
      { href: "/student", label: "Dashboard", icon: LayoutDashboard },
      { href: "/student/grades", label: "Grades", icon: ClipboardList },
      { href: "/student/timetable", label: "Timetable", icon: Calendar },
      { href: "/student/assignments", label: "Assignments", icon: BookOpen },
      { href: "/library", label: "Library", icon: Library },
    );
  }

  if (isParent) {
    navItems.push(
      { href: "/parent", label: "Dashboard", icon: LayoutDashboard },
      { href: "/parent/grades", label: "Grades", icon: ClipboardList },
      { href: "/parent/fees", label: "Fees", icon: DollarSign },
      { href: "/parent/attendance", label: "Attendance", icon: Users },
      { href: "/calendar", label: "Calendar", icon: Calendar },
    );
  }

  navItems.push(
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/settings", label: "Settings", icon: Settings },
  );

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-50 transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={closeSidebar}>
            <School className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-lg text-gray-900">BDJA</h1>
              <p className="text-xs text-gray-500 truncate max-w-[140px]">{user.full_name}</p>
            </div>
          </Link>
          <button onClick={closeSidebar} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button onClick={signOut} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 w-full">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 capitalize">
              {pathname.split("/").filter(Boolean).join(" / ") || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/messages" className="relative text-gray-500 hover:text-gray-700">
              <MessageSquare className="w-5 h-5" />
            </Link>
            <Link href="/notifications" className="relative text-gray-500 hover:text-gray-700">
              <Bell className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              {user.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
