"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/hooks/useStore";
import { hasPermission } from "@/lib/permissions";
import {
  LayoutDashboard, Users, GraduationCap, Calendar, BookOpen, MessageSquare,
  Settings, Shield, ChevronLeft, ChevronRight, Video, Library, Wallet,
  ClipboardList, UserCheck, BarChart3, LogOut, School, FileText, MapPin,
  Grid3X3, PenLine
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, perm: "viewDashboard" },
  { label: "Students", href: "/student", icon: Users, perm: "viewStudents" },
  { label: "Grades", href: "/grades", icon: GraduationCap, perm: "viewGrades" },
  { label: "Attendance", href: "/attendance", icon: UserCheck, perm: "viewAttendance" },
  { label: "Timetable", href: "/timetable", icon: Calendar, perm: "viewTimetable" },
  { label: "Assignments", href: "/assignments", icon: ClipboardList, perm: "viewAssignments" },
  { label: "VORA", href: "/vora", icon: Video, perm: "viewVora" },
  { label: "Library", href: "/library", icon: Library, perm: "viewLibrary" },
  { label: "Fees", href: "/fees", icon: Wallet, perm: "viewFees" },
  { label: "Messages", href: "/messages", icon: MessageSquare, perm: "viewMessages" },
  { label: "Admissions", href: "/admissions", icon: BookOpen, perm: "viewAdmissions" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, perm: "viewAnalytics" },
  { label: "Admin", href: "/admin", icon: Shield, perm: "manageUsers" },
  { label: "Settings", href: "/settings", icon: Settings, perm: "viewDashboard" },
];

const teacherItems = [
  { label: "My Timetables", href: "/teacher/timetables", icon: Grid3X3 },
  { label: "Registers", href: "/teacher/registers", icon: ClipboardList },
  { label: "Mark Sheets", href: "/teacher/marks", icon: PenLine },
];

const adminItems = [
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Content", href: "/admin/content", icon: FileText },
  { label: "Campuses", href: "/admin/campuses", icon: MapPin },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const role = user?.role || "student";
  const isTeacher = role === "teacher" || role === "principal" || role === "super_admin";
  const isAdmin = role === "principal" || role === "super_admin";

  const filteredNav = navItems.filter(item => hasPermission(role, item.perm as any));

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-40 bg-bdja-dark text-white transition-all duration-300 ${sidebarOpen ? "w-64" : "w-0 md:w-16 overflow-hidden"} flex flex-col`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          {sidebarOpen && <div className="flex items-center gap-2"><School className="w-6 h-6 text-bdja-secondary" /><span className="font-bold text-sm">BDJA</span></div>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
          {filteredNav.map(item => (
            <a key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-sm">
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </a>
          ))}

          {isTeacher && sidebarOpen && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Teacher Tools</p>
              {teacherItems.map(item => (
                <a key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm">
                  <item.icon className="w-4 h-4 shrink-0 text-bdja-secondary" />
                  <span className="truncate">{item.label}</span>
                </a>
              ))}
            </div>
          )}

          {isAdmin && sidebarOpen && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Administration</p>
              {adminItems.map(item => (
                <a key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm">
                  <item.icon className="w-4 h-4 shrink-0 text-bdja-secondary" />
                  <span className="truncate">{item.label}</span>
                </a>
              ))}
            </div>
          )}
        </nav>
        <div className="p-2 border-t border-white/10 shrink-0">
          <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-sm w-full text-left">
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </>
  );
}
