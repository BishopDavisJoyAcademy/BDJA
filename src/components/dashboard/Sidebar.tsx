"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/hooks/useStore";
import { cn } from "@/lib/utils";
import { getPermissions } from "@/lib/permissions";
import {
  LayoutDashboard, BookOpen, Calendar, Clock, GraduationCap, MessageSquare,
  Bell, Settings, Users, FileText, DollarSign, Library, Video, Shield,
  ChevronLeft, ChevronRight, LogOut, School, BarChart3, UserCheck, ClipboardList
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", roles: ["student", "parent", "teacher", "class_prefect", "bursar", "librarian", "principal", "super_admin"] },
  { label: "Timetable", icon: Clock, path: "/timetable", roles: ["student", "parent", "teacher", "class_prefect", "principal", "super_admin"], permission: "viewTimetable" },
  { label: "Calendar", icon: Calendar, path: "/calendar", roles: ["student", "parent", "teacher", "class_prefect", "principal", "super_admin"], permission: "viewCalendar" },
  { label: "Assignments", icon: FileText, path: "/assignments", roles: ["student", "parent", "teacher", "class_prefect", "principal", "super_admin"], permission: "viewAssignments" },
  { label: "Grades", icon: GraduationCap, path: "/grades", roles: ["student", "parent", "teacher", "class_prefect", "principal", "super_admin"], permission: "viewGrades" },
  { label: "VORA Hub", icon: Video, path: "/vora", roles: ["student", "parent", "teacher", "class_prefect", "principal", "super_admin"], permission: "viewVora" },
  { label: "Library", icon: Library, path: "/library", roles: ["student", "parent", "teacher", "class_prefect", "librarian", "principal", "super_admin"], permission: "viewLibrary" },
  { label: "Messages", icon: MessageSquare, path: "/messages", roles: ["student", "parent", "teacher", "class_prefect", "bursar", "librarian", "principal", "super_admin"], permission: "viewMessages" },
  { label: "Fees", icon: DollarSign, path: "/fees", roles: ["parent", "bursar", "principal", "super_admin"], permission: "viewFees" },
  { label: "Attendance", icon: UserCheck, path: "/attendance", roles: ["student", "parent", "teacher", "class_prefect", "principal", "super_admin"], permission: "viewAttendance" },
  { label: "Admissions", icon: ClipboardList, path: "/admissions", roles: ["principal", "super_admin"], permission: "viewAdmissions" },
  { label: "Users", icon: Users, path: "/admin/users", roles: ["principal", "super_admin"], permission: "manageUsers" },
  { label: "Analytics", icon: BarChart3, path: "/admin/analytics", roles: ["principal", "super_admin", "bursar", "librarian"], permission: "viewAnalytics" },
  { label: "Settings", icon: Settings, path: "/settings", roles: ["principal", "super_admin"], permission: "manageRoles" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  if (!user) return null;

  const permissions = getPermissions(user.role);

  const filteredNav = navItems.filter((item) => {
    if (!item.roles.includes(user.role)) return false;
    if (item.permission && !permissions[item.permission as keyof typeof permissions]) return false;
    return true;
  });

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-bdja-primary text-white transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:translate-x-0 lg:w-20 xl:w-64"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <School className="w-6 h-6 text-bdja-secondary" />
            </div>
            <div className={cn("transition-opacity", sidebarOpen || "lg:opacity-0 xl:opacity-100")}>
              <h1 className="font-bold text-sm whitespace-nowrap">BDJA Platform</h1>
              <p className="text-[10px] text-white/60 whitespace-nowrap">Prayer - Commitment - Success</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                  isActive
                    ? "bg-bdja-secondary text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className={cn("text-sm font-medium whitespace-nowrap transition-opacity", sidebarOpen || "lg:opacity-0 xl:opacity-100")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={cn("text-sm font-medium whitespace-nowrap transition-opacity", sidebarOpen || "lg:opacity-0 xl:opacity-100")}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-6 left-6 z-50 w-10 h-10 bg-bdja-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-bdja-accent transition-colors lg:flex hidden"
      >
        {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>
    </>
  );
}
