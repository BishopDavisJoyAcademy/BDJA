"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { JoyChat } from "@/components/joy/JoyChat";
import { QueryProvider } from "@/components/shared/QueryProvider";
import { useAuth } from "@/hooks/useAuth";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  useInactivityLogout();

  useEffect(() => {
    if (!loading && !user) {
      if (error?.type === "account_suspended") {
        router.push("/login?error=suspended");
      } else if (error?.type === "profile_missing") {
        router.push("/login?error=profile_missing");
      } else if (error?.type === "account_locked") {
        router.push("/login?error=account_locked");
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, error, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <QueryProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
        <JoyChat />
      </div>
    </QueryProvider>
  );
}
