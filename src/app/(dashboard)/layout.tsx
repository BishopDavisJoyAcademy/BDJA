"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { JoyChat } from "@/components/joy/JoyChat";
import { useAppStore } from "@/hooks/useStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { sidebarOpen } = useAppStore();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bdja-light">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading BDJA...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen dashboard-bg">
      <Sidebar />
      <div className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <TopBar />
        <main className="p-6 pt-20">{children}</main>
      </div>
      <JoyChat />
    </div>
  );
}
