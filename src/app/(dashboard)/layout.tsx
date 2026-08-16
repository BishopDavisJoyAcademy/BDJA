"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Users, GraduationCap, FileText, MessageSquare, BarChart3, Shield, Settings, Bug,
  BookOpen, Video, Building2, Calendar, LogOut, ChevronDown, ChevronRight, Sparkles,
  Wrench, UserCog, AlertTriangle, Globe, PlusCircle, X, Menu
} from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";
import { JoyChat } from "@/components/joy/JoyChat";

interface NavItem {
  label: string; href: string; icon: React.ElementType;
  children?: { label: string; href: string }[];
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: `/${ADMIN_SEGMENT}`, icon: LayoutDashboard },
  {
    label: "People", href: "#", icon: Users,
    children: [
      { label: "Staff", href: `/${ADMIN_SEGMENT}/staff` },
      { label: "Students", href: `/${ADMIN_SEGMENT}/students` },
      { label: "All Users", href: `/${ADMIN_SEGMENT}/users` },
    ]
  },
  { label: "CMS Pages", href: `/${ADMIN_SEGMENT}/pages`, icon: FileText },
  { label: "Content", href: `/${ADMIN_SEGMENT}/content`, icon: Globe },
  { label: "Subjects", href: `/${ADMIN_SEGMENT}/subjects`, icon: BookOpen },
  { label: "VORA Videos", href: `/${ADMIN_SEGMENT}/vora`, icon: Video },
  { label: "Campuses", href: `/${ADMIN_SEGMENT}/campuses`, icon: Building2 },
  { label: "Calendar", href: "/manage/calendar", icon: Calendar },
  { label: "Suggestions", href: `/${ADMIN_SEGMENT}/suggestions`, icon: MessageSquare },
  { label: "Analytics", href: `/${ADMIN_SEGMENT}/analytics`, icon: BarChart3 },
  { label: "Audit Logs", href: `/${ADMIN_SEGMENT}/audit`, icon: Shield },
  { label: "Error Logs", href: `/${ADMIN_SEGMENT}/errors`, icon: Bug },
  { label: "God Mode", href: `/${ADMIN_SEGMENT}/god-mode`, icon: UserCog },
  { label: "Setup", href: `/${ADMIN_SEGMENT}/setup`, icon: Wrench },
  { label: "Settings", href: "/settings", icon: Settings },
];

const staffNav: NavItem[] = [
  { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
  { label: "Students", href: "/teacher/students", icon: GraduationCap },
  { label: "Calendar", href: "/manage/calendar", icon: Calendar },
  { label: "Settings", href: "/settings", icon: Settings },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "Calendar", href: "/student/calendar", icon: Calendar },
  { label: "Settings", href: "/settings", icon: Settings },
];

const parentNav: NavItem[] = [
  { label: "Dashboard", href: "/parent", icon: LayoutDashboard },
  { label: "Calendar", href: "/parent/calendar", icon: Calendar },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ People: true });
  const [joyOpen, setJoyOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); }
  }, [user, loading, router]);

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const getNav = () => {
    if (!user) return [];
    if (user.user_category === "admin") return adminNav;
    if (user.user_category === "staff") return staffNav;
    if (user.user_category === "student") return studentNav;
    if (user.user_category === "parent") return parentNav;
    return [];
  };

  const nav = getNav();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="BDJA" width={32} height={32} className="object-contain" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col border-r border-slate-800/50 bg-slate-900/50 backdrop-blur-xl transition-all duration-300 ${sidebarOpen ? "w-72" : "w-20"}`}>
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-slate-800/50 ${sidebarOpen ? "px-5 gap-3" : "px-0 justify-center"}`}>
          <div className="w-9 h-9 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center overflow-hidden shrink-0">
            <Image src="/logo.png" alt="BDJA" width={28} height={28} className="object-contain" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="font-bold text-white text-sm leading-tight">BDJA</p>
              <p className="text-[10px] text-gray-500 leading-tight">Admin Portal</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const hasChildren = !!item.children?.length;
            const isExpanded = expandedSections[item.label] ?? false;
            const active = isActive(item.href) || (hasChildren && item.children?.some((c) => isActive(c.href)));

            return (
              <div key={item.label}>
                {hasChildren ? (
                  <button onClick={() => toggleSection(item.label)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-gray-400 hover:bg-slate-800/50 hover:text-gray-200"} ${!sidebarOpen && "justify-center px-2"}`}>
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {sidebarOpen && <span className="flex-1 text-left">{item.label}</span>}
                    {sidebarOpen && (isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
                  </button>
                ) : (
                  <Link href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-gray-400 hover:bg-slate-800/50 hover:text-gray-200"} ${!sidebarOpen && "justify-center px-2"}`}>
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                )}
                {hasChildren && isExpanded && sidebarOpen && (
                  <div className="ml-6 mt-1 space-y-0.5 border-l border-slate-800 pl-3">
                    {item.children?.map((child) => (
                      <Link key={child.href} href={child.href} className={`block px-3 py-2 rounded-lg text-sm transition-all ${isActive(child.href) ? "text-amber-400 font-medium" : "text-gray-500 hover:text-gray-300"}`}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-slate-800/50 space-y-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-300 hover:bg-slate-800/50 transition-all ${!sidebarOpen && "justify-center"}`}>
            {sidebarOpen ? <ChevronRight className="w-4 h-4 rotate-180" /> : <ChevronRight className="w-4 h-4" />}
            {sidebarOpen && <span>Collapse</span>}
          </button>
          <button onClick={() => signOut().then(() => router.push("/login"))} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all ${!sidebarOpen && "justify-center"}`}>
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
          {sidebarOpen && (
            <div className="px-3 py-2">
              <p className="text-xs text-gray-600 truncate">{user.email}</p>
              <p className="text-[10px] text-gray-700 capitalize">{user.user_category}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center overflow-hidden">
                  <Image src="/logo.png" alt="BDJA" width={28} height={28} className="object-contain" />
                </div>
                <div><p className="font-bold text-white text-sm">BDJA</p><p className="text-[10px] text-gray-500">Admin Portal</p></div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const hasChildren = !!item.children?.length;
                const isExpanded = expandedSections[item.label] ?? false;
                const active = isActive(item.href) || (hasChildren && item.children?.some((c) => isActive(c.href)));
                return (
                  <div key={item.label}>
                    {hasChildren ? (
                      <button onClick={() => toggleSection(item.label)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-gray-400 hover:bg-slate-800/50 hover:text-gray-200"}`}>
                        <Icon className="w-[18px] h-[18px] shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    ) : (
                      <Link href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-gray-400 hover:bg-slate-800/50 hover:text-gray-200"}`}>
                        <Icon className="w-[18px] h-[18px] shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    )}
                    {hasChildren && isExpanded && (
                      <div className="ml-6 mt-1 space-y-0.5 border-l border-slate-800 pl-3">
                        {item.children?.map((child) => (
                          <Link key={child.href} href={child.href} onClick={() => setMobileOpen(false)} className={`block px-3 py-2 rounded-lg text-sm transition-all ${isActive(child.href) ? "text-amber-400 font-medium" : "text-gray-500 hover:text-gray-300"}`}>{child.label}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-800/50">
              <button onClick={() => signOut().then(() => router.push("/login"))} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
                <LogOut className="w-[18px] h-[18px]" /><span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center justify-between px-4 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="BDJA" width={24} height={24} className="object-contain" />
            </div>
            <span className="font-bold text-white text-sm">BDJA</span>
          </div>
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-gray-400 hover:text-white"><Menu className="w-5 h-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>

      {/* Joy Floating Button */}
      <button onClick={() => setJoyOpen(!joyOpen)} className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all flex items-center justify-center border border-violet-400/20">
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Joy Chat Panel */}
      {joyOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col">
          <div className="h-12 flex items-center justify-between px-4 border-b border-slate-800/50 bg-slate-800/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold text-white">Joy AI</span>
            </div>
            <button onClick={() => setJoyOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-hidden">
            <JoyChat />
          </div>
        </div>
      )}
    </div>
  );
}
