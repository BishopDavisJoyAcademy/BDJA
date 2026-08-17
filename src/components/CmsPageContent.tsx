"use client";

import { useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Loader2, AlertCircle } from "lucide-react";

interface CmsPageData {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description: string | null;
  meta_keywords: string | null;
  is_published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface PagesResponse {
  pages?: CmsPageData[];
  page?: CmsPageData | null;
}

interface CmsPageContentProps {
  slug?: string;
  fallback?: ReactNode;
}

export function CmsPageContent({ slug: propSlug, fallback }: CmsPageContentProps) {
  const pathname = usePathname();
  const slug = propSlug || pathname.replace(/^\//, "") || "home";
  const [page, setPage] = useState<CmsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<PagesResponse>(`/api/admin/pages?slug=${slug}`)
      .then((d) => {
        const found = (d.pages || []).find((p) => p.slug === slug);
        setPage(found || null);
        setLoading(false);
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      });
  }, [slug]);

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );

  if (error)
    return (
      <div className="p-4 bg-red-500/10 text-red-400 rounded-xl flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );

  if (!page) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="text-gray-400 text-center py-12">
        Page content coming soon.
      </div>
    );
  }

  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-6">{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </div>
  );
}

export default CmsPageContent;
