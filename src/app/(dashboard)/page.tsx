"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardHome() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      switch (user.role) {
        case "student":
          router.push("/student");
          break;
        case "parent":
          router.push("/parent");
          break;
        case "teacher":
        case "class_prefect":
          router.push("/teacher");
          break;
        case "bursar":
          router.push("/bursar");
          break;
        case "librarian":
          router.push("/librarian");
          break;
        case "principal":
        case "super_admin":
          router.push("/admin");
          break;
        default:
          router.push("/student");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
