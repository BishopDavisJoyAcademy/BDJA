"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_SEGMENT } from "@/lib/constants";

export default function DashboardRedirector() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const cat = user.user_category;
    if (cat === "admin") router.replace(`/${ADMIN_SEGMENT}`);
    else if (cat === "staff") router.replace("/teacher");
    else if (cat === "parent") router.replace("/parent");
    else router.replace("/student");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Preparing your workspace...</p>
      </div>
    </div>
  );
}
