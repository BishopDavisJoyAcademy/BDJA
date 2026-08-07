"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Settings } from "lucide-react";

export default function SetupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Setup</h1>
        <p className="text-gray-500">Configure platform settings</p>
      </div>
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Settings className="w-5 h-5 text-bdja-primary" />
          <span className="font-medium">Platform Configuration</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">Setup options will appear here.</p>
      </Card>
    </div>
  );
}
