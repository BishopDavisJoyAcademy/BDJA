"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Loader2 } from "lucide-react";

interface CmsPageContentProps {
  slug: string;
  fallbackTitle: string;
  fallbackContent: React.ReactNode;
  metaDescription?: string;
}

export function CmsPageContent({ slug, fallbackTitle, fallbackContent, metaDescription }: CmsPageContentProps) {
  const [page, setPage] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      interface CmsPageRow {
        title: string;
        content: string;
      }

      const { data } = await supabase
        .from("cms_pages")
        .select("title, content")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle() as { data: CmsPageRow | null; error: any };
      if (data) setPage(data);
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-bdja-primary animate-spin" />
      </div>
    );
  }

  const title = page?.title || fallbackTitle;

  return (
    <ScrollReveal>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-bdja-primary mb-3">{title}</h1>
          <div className="w-16 h-1 bg-bdja-secondary rounded-full" />
        </div>
        {page?.content ? (
          <div
            className="prose prose-lg max-w-none prose-headings:text-bdja-primary prose-a:text-bdja-accent hover:prose-a:text-bdja-primary prose-strong:text-bdja-dark"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        ) : (
          <div className="text-gray-600 leading-relaxed">{fallbackContent}</div>
        )}
      </div>
    </ScrollReveal>
  );
}
