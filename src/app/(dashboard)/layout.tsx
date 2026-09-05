"use client";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Users, GraduationCap, FileText, MessageSquare, BarChart3, Shield, Settings, Bug,
  BookOpen, Video, Building2, Calendar, LogOut, ChevronDown, ChevronRight,
  Wrench, UserCog, AlertCircle, Globe, X, Menu,
  ClipboardCheck, Receipt, Award, Megaphone, UserCheck, Wallet, Clock, Baby,
  Sparkles
} from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";
import { JoyChat } from "@/components/joy/JoyChat";
import { JoyPageBubble } from "@/components/joy/JoyPageBubble";
import { ParentProvider, ChildSelector } from "@/contexts/ParentContext";

interface NavItem {
  label: string; href: string; icon: React.ElementType;
  children?: { label: string; href: string }[];
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: `/${ADMIN_SEGMENT}`, icon: LayoutDashboard },
  { label: "People", href: "#", icon: Users, children: [
    { label: "Staff", href: `/${ADMIN_SEGMENT}/staff` },
    { label: "Students", href: `/${ADMIN_SEGMENT}/students` },
    { label: "All Users", href: `/${ADMIN_SEGMENT}/users` },
  ]},
  { label: "CMS Pages", href: `/${ADMIN_SEGMENT}/pages`, icon: FileText },
  { label: "Content", href: `/${ADMIN_SEGMENT}/content`, icon: Globe },
  { label: "Subjects", href: `/${ADMIN_SEGMENT}/subjects`, icon: BookOpen },
  { label: "VORA Videos", href: `/${ADMIN_SEGMENT}/vora`, icon: Video },
  { label: "Campuses", href: `/${ADMIN_SEGMENT}/campuses`, icon: Building2 },
  { label: "Calendar", href: "/manage/calendar", icon: Calendar },
  { label: "Suggestions", href: `/${ADMIN_SEGMENT}/suggestions`, icon: MessageSquare },
  { label: "Analytics", href: `/${ADMIN_SEGMENT}/analytics`, icon: BarChart3 },

  { label: "Joy AI", href: "#", icon: Sparkles, children: [
    { label: "Knowledge Base", href: `/${ADMIN_SEGMENT}/joy-knowledge` },
    { label: "Page Assistants", href: `/${ADMIN_SEGMENT}/joy-assistants` },
    { label: "Request Inbox", href: `/${ADMIN_SEGMENT}/joy-requests` },
  ]},
  { label: "Audit Logs", href: `/${ADMIN_SEGMENT}/audit`, icon: Shield },
  { label: "Error Logs", href: `/${ADMIN_SEGMENT}/errors`, icon: Bug },
  { label: "God Mode", href: `/${ADMIN_SEGMENT}/god-mode`, icon: UserCog },
  { label: "Setup", href: `/${ADMIN_SEGMENT}/setup`, icon: Wrench },
  { label: "Settings", href: "/settings", icon: Settings },
];

const staffNav: NavItem[] = [
  { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
  { label: "Students", href: "/teacher/students", icon: GraduationCap },
  { label: "Class Dashboard", href: "/teacher/class-dashboard", icon: BarChart3 },
  { label: "Marks", href: "/teacher/marks", icon: Award },
  { label: "Assignments", href: "/teacher/assignments", icon: FileText },
  { label: "VORA", href: "/teacher/vora", icon: Video },
  { label: "Registers", href: "/teacher/registers", icon: ClipboardCheck },
  { label: "Timetables", href: "/teacher/timetables", icon: Calendar },
  { label: "Settings", href: "/settings", icon: Settings },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "Assignments", href: "/student/assignments", icon: BookOpen },
  { label: "Attendance", href: "/student/attendance", icon: ClipboardCheck },
  { label: "Grades", href: "/student/grades", icon: Award },
  { label: "Report Card", href: "/student/report-card", icon: FileText },
  { label: "Analytics", href: "/student/analytics", icon: BarChart3 },
  { label: "Announcements", href: "/student/announcements", icon: Megaphone },
  { label: "Fees", href: "/student/fees", icon: Receipt },
  { label: "Calendar", href: "/student/calendar", icon: Calendar },
  { label: "Settings", href: "/settings", icon: Settings },
];

const parentNav: NavItem[] = [
  { label: "Dashboard", href: "/parent", icon: LayoutDashboard },
  { label: "Grades", href: "/parent/grades", icon: Award },
  { label: "Attendance", href: "/parent/attendance", icon: UserCheck },
  { label: "Assignments", href: "/parent/assignments", icon: BookOpen },
  { label: "Fees", href: "/parent/fees", icon: Wallet },
  { label: "Messages", href: "/parent/messages", icon: MessageSquare },
  { label: "Calendar", href: "/parent/calendar", icon: Calendar },
  { label: "Announcements", href: "/parent/announcements", icon: Megaphone },
  { label: "Timetable", href: "/parent/timetable", icon: Clock },
  { label: "Child Profile", href: "/parent/child-profile", icon: Baby },
  { label: "Settings", href: "/settings", icon: Settings },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, loading, error, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ People: true });
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (!pathname.startsWith("/login") && !pathname.startsWith("/unauthorized")) {
        setRedirecting(true);
        const loginUrl = new URL("/login", window.location.origin);
        loginUrl.searchParams.set("redirect", pathname);
        router.push(loginUrl.toString());
      }
    }
  }, [user, loading, router, pathname]);

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const [hasChildren, setHasChildren] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Check if user has children linked (for parent nav access)
    const checkChildren = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!s?.access_token) return;
        const res = await fetch("/api/parent/children", {
          headers: { Authorization: `Bearer ${s.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setHasChildren((data.children || []).length > 0);
        }
      } catch { /* silent */ }
    };
    checkChildren();
  }, [user]);

  const getNav = () => {
    if (!user) return [];
    if (user.user_category === "admin") return adminNav;
    if (user.user_category === "staff") return staffNav;
    if (user.user_category === "student") return studentNav;
    if (user.user_category === "parent" || hasChildren) return parentNav;
    return [];
  };

  const nav = getNav();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const isParentRoute = pathname.startsWith("/parent");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="BDJA" width={32} height={32} className="object-contain" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#D4AF37" }} />
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md w-full bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Authentication Error</h2>
          <p className="text-slate-400 text-sm mb-6">{error.message}</p>
          <button onClick={() => router.push("/login")} className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: "#D4AF3715", color: "#D4AF37", border: "1px solid #D4AF3730" }}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#D4AF37" }} />
          <p className="text-sm text-slate-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <aside className={`hidden lg:flex flex-col border-r border-slate-800/50 bg-slate-900/50 backdrop-blur-xl transition-all duration-300 ${sidebarOpen ? "w-72" : "w-20"}`}>
        <div className={`h-16 flex items-center border-b border-slate-800/50 ${sidebarOpen ? "px-5 gap-3" : "px-0 justify-center"}`}>
          <div className="w-9 h-9 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center overflow-hidden shrink-0">
            <Image src="/logo.png" alt="BDJA" width={28} height={28} className="object-contain" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="font-bold text-white text-sm leading-tight">BDJA</p>
              <p className="text-[10px] text-slate-500 leading-tight capitalize">{user.user_category} Portal</p>
            </div>
          )}
        </div>
        {isParentRoute && sidebarOpen && (
          <div className="px-3 pt-3 pb-1">
            <ChildSelector />
          </div>
        )}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const hasChildren = !!item.children?.length;
            const isExpanded = expandedSections[item.label] ?? false;
            const active = isActive(item.href) || (hasChildren && item.children?.some((c) => isActive(c.href)));
            return (
              <div key={item.label}>
                {hasChildren ? (
                  <button onClick={() => toggleSection(item.label)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"} ${!sidebarOpen && "justify-center px-2"}`}>
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {sidebarOpen && <span className="flex-1 text-left">{item.label}</span>}
                    {sidebarOpen && (isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
                  </button>
                ) : (
                  <Link href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"} ${!sidebarOpen && "justify-center px-2"}`}>
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                )}
                {hasChildren && isExpanded && sidebarOpen && (
                  <div className="ml-6 mt-1 space-y-0.5 border-l border-slate-800 pl-3">
                    {item.children?.map((child) => (
                      <Link key={child.href} href={child.href} className={`block px-3 py-2 rounded-lg text-sm transition-all ${isActive(child.href) ? "text-[#D4AF37] font-medium" : "text-slate-500 hover:text-slate-300"}`}>{child.label}</Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800/50 space-y-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all ${!sidebarOpen && "justify-center"}`}>
            {sidebarOpen ? <ChevronRight className="w-4 h-4 rotate-180" /> : <ChevronRight className="w-4 h-4" />}
            {sidebarOpen && <span>Collapse</span>}
          </button>
          <button onClick={() => signOut().then(() => router.push("/login"))} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all ${!sidebarOpen && "justify-center"}`}>
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
          {sidebarOpen && (
            <div className="px-3 py-2">
              <p className="text-xs text-slate-600 truncate">{user.email}</p>
              <p className="text-[10px] text-slate-700 capitalize">{user.user_category}</p>
            </div>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center overflow-hidden">
                  <Image src="/logo.png" alt="BDJA" width={28} height={28} className="object-contain" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">BDJA</p>
                  <p className="text-[10px] text-slate-500 capitalize">{user.user_category} Portal</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {isParentRoute && (
              <div className="px-3 pt-3 pb-1"><ChildSelector /></div>
            )}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const hasChildren = !!item.children?.length;
                const isExpanded = expandedSections[item.label] ?? false;
                const active = isActive(item.href) || (hasChildren && item.children?.some((c) => isActive(c.href)));
                return (
                  <div key={item.label}>
                    {hasChildren ? (
                      <button onClick={() => toggleSection(item.label)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}>
                        <Icon className="w-[18px] h-[18px] shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    ) : (
                      <Link href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}>
                        <Icon className="w-[18px] h-[18px] shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    )}
                    {hasChildren && isExpanded && (
                      <div className="ml-6 mt-1 space-y-0.5 border-l border-slate-800 pl-3">
                        {item.children?.map((child) => (
                          <Link key={child.href} href={child.href} onClick={() => setMobileOpen(false)} className={`block px-3 py-2 rounded-lg text-sm transition-all ${isActive(child.href) ? "text-[#D4AF37] font-medium" : "text-slate-500 hover:text-slate-300"}`}>{child.label}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-800/50">
              <button onClick={() => { setMobileOpen(false); signOut().then(() => router.push("/login")); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
                <LogOut className="w-[18px] h-[18px] shrink-0" /><span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white"><Menu className="w-5 h-5" /></button>
            <h1 className="text-sm font-medium text-slate-300 capitalize hidden sm:block">{pathname.replace(/^\//, "").replace(/\//g, " / ") || "Dashboard"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium">
                {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "?"}
              </div>
              <span className="hidden sm:block">{user.full_name || user.email}</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
      <JoyPageBubble />
          <JoyChat />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isParent = user?.user_category === "parent";
  return (
    <DashboardContent>
      {isParent ? <ParentProvider>{children}</ParentProvider> : children}
    </DashboardContent>
  );
}
