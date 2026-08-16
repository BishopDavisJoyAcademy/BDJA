"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Loader2, FileText, BookOpen, Video } from "lucide-react";

interface ContentStats {
  cmsPages: number;
  libraryResources: number;
  voraVideos: number;
}

export default function ContentPage() {
  const [stats, setStats] = useState<ContentStats>({ cmsPages: 0, libraryResources: 0, voraVideos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<{ pages: unknown[] }>("/api/admin/pages"),
      apiGet<{ resources: unknown[]; books?: unknown[] }>("/api/library"),
      apiGet<{ videos: unknown[] }>("/api/vora"),
    ])
      .then(([pagesData, libData, voraData]) => {
        setStats({
          cmsPages: (pagesData.pages || []).length,
          libraryResources: (libData.resources || libData.books || []).length,
          voraVideos: (voraData.videos || []).length,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Content Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-amber-400" />
            <div>
              <p className="text-sm text-gray-400">CMS Pages</p>
              <p className="text-2xl font-bold text-white">{stats.cmsPages}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <BookOpen className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-sm text-gray-400">Library Resources</p>
              <p className="text-2xl font-bold text-white">{stats.libraryResources}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Video className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">Vora Videos</p>
              <p className="text-2xl font-bold text-white">{stats.voraVideos}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
