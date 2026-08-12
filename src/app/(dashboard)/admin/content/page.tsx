"use client";
import { ADMIN_SEGMENT } from "@/lib/constants";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { FileText, Globe, BookOpen, Video, Loader2 } from "lucide-react";

interface ContentStat {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}

export default function ContentManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<ContentStat[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && user?.role !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "admin") {
      // Simulated stats — in production these would come from aggregated API calls
      setStats([
        { label: "CMS Pages", count: 0, icon: <Globe className="w-5 h-5" />, color: "bg-blue-50 text-blue-600" },
        { label: "Library Resources", count: 0, icon: <BookOpen className="w-5 h-5" />, color: "bg-green-50 text-green-600" },
        { label: "VORA Videos", count: 0, icon: <Video className="w-5 h-5" />, color: "bg-purple-50 text-purple-600" },
        { label: "Documents", count: 0, icon: <FileText className="w-5 h-5" />, color: "bg-orange-50 text-orange-600" },
      ]);
      setFetching(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-bdja-primary animate-spin" />
      </div>
    );
  }

  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-500">Manage all platform content from one place</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
          <div className="space-y-2">
            <button onClick={() => router.push(`/${ADMIN_SEGMENT}/pages`)} className="w-full text-left p-3 border border-gray-100 rounded-lg hover:bg-gray-50 flex items-center gap-3">
              <Globe className="w-4 h-4 text-blue-600" /> CMS Pages
            </button>
            <button onClick={() => router.push("/manage/library")} className="w-full text-left p-3 border border-gray-100 rounded-lg hover:bg-gray-50 flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-green-600" /> Library Catalog
            </button>
            <button onClick={() => router.push(`/${ADMIN_SEGMENT}/vora`)} className="w-full text-left p-3 border border-gray-100 rounded-lg hover:bg-gray-50 flex items-center gap-3">
              <Video className="w-4 h-4 text-purple-600" /> VORA Content
            </button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Content Overview</h3>
          <p className="text-sm text-gray-500">Manage pages, resources, videos, and documents across the platform. Use the quick links above to navigate to specific content areas.</p>
        </Card>
      </div>
    </div>
  );
}
