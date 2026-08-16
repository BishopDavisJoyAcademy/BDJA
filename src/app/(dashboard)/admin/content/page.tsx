"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, Globe, BookOpen, Video, Loader2, ArrowRight } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";
import { apiGet } from "@/lib/api-client";
import Link from "next/link";

export default function ContentManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ cmsPages: 0, libraryResources: 0, voraVideos: 0, documents: 0 });
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.role !== "admin") { router.push("/unauthorized"); return; }
    if (user?.role === "admin") {
      Promise.all([
        apiGet("/api/admin/pages"),
        apiGet("/api/library"),
        apiGet("/api/admin/vora"),
      ]).then(([pagesData, libData, voraData]) => {
        setStats({
          cmsPages: (pagesData.pages || []).length,
          libraryResources: (libData.resources || libData.books || []).length,
          voraVideos: (voraData.videos || []).length,
          documents: 0, // Could be expanded with a documents table
        });
        setFetching(false);
      }).catch(() => setFetching(false));
    }
  }, [user, authLoading, router]);

  if (authLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div></div>;
  if (user?.role !== "admin") return null;

  const statCards = [
    { label: "CMS Pages", count: stats.cmsPages, icon: Globe, href: `/${ADMIN_SEGMENT}/pages`, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    { label: "Library Resources", count: stats.libraryResources, icon: BookOpen, href: "/library", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { label: "VORA Videos", count: stats.voraVideos, icon: Video, href: `/${ADMIN_SEGMENT}/vora`, color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
    { label: "Documents", count: stats.documents, icon: FileText, href: "#", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-white">Content Management</h1><p className="text-gray-400 mt-1">Manage all platform content from one place</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600 transition-all group">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${s.color}`}><Icon className="w-5 h-5" /></div>
                <div>
                  <p className="text-sm text-gray-400">{s.label}</p>
                  <p className="text-2xl font-bold text-white">{fetching ? "—" : s.count}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-gray-500 group-hover:text-amber-400 transition-colors"><span>Manage</span><ArrowRight className="w-3 h-3" /></div>
            </Link>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
          <div className="space-y-2">
            <Link href={`/${ADMIN_SEGMENT}/pages`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700/30 hover:border-slate-600 transition-all text-sm font-medium text-gray-200"><FileText className="w-4 h-4 text-amber-400" /> CMS Pages</Link>
            <Link href="/manage/library" className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700/30 hover:border-slate-600 transition-all text-sm font-medium text-gray-200"><BookOpen className="w-4 h-4 text-emerald-400" /> Library</Link>
            <Link href={`/${ADMIN_SEGMENT}/vora`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700/30 hover:border-slate-600 transition-all text-sm font-medium text-gray-200"><Video className="w-4 h-4 text-violet-400" /> VORA Videos</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
