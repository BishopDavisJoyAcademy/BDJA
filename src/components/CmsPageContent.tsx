"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api-client";

interface CmsPage {
  id: string; slug: string; title: string; content: string;
  meta_description?: string | null; is_published: boolean | null;
}

export default function CmsPageContent({ slug, fallback }: { slug: string; fallback?: React.ReactNode }) {
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet(`/api/admin/pages?slug=${encodeURIComponent(slug)}`)
      .then((d) => {
        const found = (d.pages || []).find((p: CmsPage) => p.slug === slug);
        if (found && found.is_published) setPage(found);
        else setPage(null);
        setLoading(false);
      })
      .catch((err) => { setError(getErrorMessage(err)); setLoading(false); });
  }, [slug]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div>;
  if (error) return <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 text-sm"><AlertCircle className="w-4 h-4 inline mr-2" />{error}</div>;
  if (!page) return fallback || <div className="text-center py-12 text-gray-500"><p>This page is coming soon.</p></div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{page.title}</h1>
      <div className="prose prose-lg max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: page.content }} />
    </div>
  );
}
