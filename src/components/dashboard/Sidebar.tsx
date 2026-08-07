"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/hooks/useStore";
import { useModuleVisibility } from "@/hooks/useModuleVisibility";
import {
  LayoutDashboard, Users, GraduationCap, Calendar, BookOpen, MessageSquare,
  Settings, Shield, ChevronLeft, ChevronRight, Video, Library, Wallet,
  ClipboardList, UserCheck, BarChart3, LogOut, School, FileText, MapPin,
  PenLine, Bell, Home, HelpCircle
} from "lucide-react";
import Link from "next/link";

const getDashboardHref = (userCategory: string | null, role: string | null) => {
  if (userCategory === "student") return "/student";
  if (userCategory === "parent") return "/parent";
  if (userCategory === "staff") return "/teacher";
  if (userCategory === "admin") return "/admin";
  if (role === "student") return "/student";
  if (role === "parent") return "/parent";
  if (role === "teacher") return "/teacher";
  if (role === "principal" || role === "super_admin") return "/admin";
  return "/student";
};

interface NavItem {
  label: string;
  href: string;
  icon: any;
  module?: keyof ReturnType<typeof useModuleVisibility>;
  showFor?: string[]; // user_categories that can see this
}

const mainNavItems: NavItem[] = [
  { label: "Students", href: "/student", icon: Users, module: "showStudents", showFor: ["student", "staff", "admin"] },
  { label: "Grades", href: "/grades", icon: GraduationCap, module: "showGrades", showFor: ["student", "staff", "admin"] },
  { label: "Attendance", href: "/attendance", icon: UserCheck, module: "showAttendance", showFor: ["student", "staff", "admin"] },
  { label: "Timetable", href: "/timetable", icon: Calendar, module: "showTimetable", showFor: ["student", "staff", "admin"] },
  { label: "Assignments", href: "/assignments", icon: ClipboardList, module: "showAssignments", showFor: ["student", "staff", "admin"] },
  { label: "Calendar", href: "/calendar", icon: Calendar, module: "showCalendar", showFor: ["student", "staff", "admin", "parent"] },
  { label: "VORA", href: "/vora", icon: Video, module: "showVora", showFor: ["student", "staff", "admin"] },
  { label: "Library", href: "/library", icon: Library, module: "showLibrary", showFor: ["student", "staff", "admin"] },
  { label: "Fees", href: "/fees", icon: Wallet, module: "showFees", showFor: ["student", "staff", "admin"] },
  { label: "Messages", href: "/messages", icon: MessageSquare, module: "showMessages", showFor: ["student", "staff", "admin", "parent"] },
  { label: "Admissions", href: "/admissions", icon: BookOpen, module: "showAdmissions", showFor: ["admin"] },
];

const adminNavItems: NavItem[] = [
  { label: "Staff", href: "/admin/staff", icon: Users },
  { label: "Students", href: "/admin/students", icon: GraduationCap },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Audit Logs", href: "/admin/audit", icon: Shield },
  { label: "CMS Pages", href: "/admin/pages", icon: FileText },
  { label: "Content", href: "/admin/content", icon: FileText },
  { label: "Campuses", href: "/admin/campuses", icon: MapPin },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const teacherTools: NavItem[] = [
  { label: "My Classes", href: "/teacher", icon: Users },
  { label: "Mark Sheets", href: "/grades", icon: PenLine },
  { label: "Attendance", href: "/attendance", icon: UserCheck },
  { label: "Assignments", href: "/assignments", icon: ClipboardList },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const visibility = useModuleVisibility();
  const userCategory = user?.user_category || null;
  const role = user?.role || "student";
  const isAdmin = userCategory === "admin";
  const isStaff = userCategory === "staff";
  const isStudent = userCategory === "student";
  const isParent = userCategory === "parent";

  // Show items based on user category + permission (if permission system is working)
  const filteredMain = mainNavItems.filter((item) => {
    const categoryMatch = item.showFor?.includes(userCategory || "") ?? true;
    const permissionMatch = item.module ? visibility[item.module] : true;
    return categoryMatch || permissionMatch;
  });

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-bdja-dark text-white transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-0 md:w-16 overflow-hidden"
        } flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <School className="w-6 h-6 text-bdja-secondary" />
              <span className="font-bold text-sm">BDJA</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
          {/* Dashboard Home */}
          <Link
            href={getDashboardHref(userCategory, role)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-sm"
          >
            <Home className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="truncate">Home</span>}
          </Link>

          {/* Main Navigation */}
          {filteredMain.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-sm"
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
          ))}

          {/* Parent Section */}
          {isParent && sidebarOpen && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Parent</p>
              <Link href="/parent" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm">
                <Users className="w-4 h-4 shrink-0 text-bdja-secondary" />
                <span>My Children</span>
              </Link>
              <Link href="/parent/grades" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm">
                <GraduationCap className="w-4 h-4 shrink-0 text-bdja-secondary" />
                <span>Academic Reports</span>
              </Link>
              <Link href="/parent/fees" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm">
                <Wallet className="w-4 h-4 shrink-0 text-bdja-secondary" />
                <span>Fee Balance</span>
              </Link>
            </div>
          )}

          {/* Staff / Teacher Tools */}
          {(isStaff || isAdmin) && sidebarOpen && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                {isAdmin ? "Staff Tools" : "Teacher Tools"}
              </p>
              {teacherTools.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm"
                >
                  <item.icon className="w-4 h-4 shrink-0 text-bdja-secondary" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Admin Section */}
          {isAdmin && sidebarOpen && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Administration</p>
              {adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm"
                >
                  <item.icon className="w-4 h-4 shrink-0 text-bdja-secondary" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="p-2 border-t border-white/10 shrink-0 space-y-1">
          <Link href="/help" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-sm">
            <HelpCircle className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Help</span>}
          </Link>
          <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-sm w-full text-left">
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}
    </>
  );
}
