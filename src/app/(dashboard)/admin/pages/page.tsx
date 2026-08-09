"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

const PAGE_SLUGS = ["about", "admissions", "contact", "policies", "faqs"];

export default function CmsPages() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pages, setPages] = useState<Record<string, any>>({});
  const [activeSlug, setActiveSlug] = useState("about");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && user?.user_category !== "admin") {
      router.push("/unauthorized");
      return;
    }
    if (user?.user_category === "admin") {
      fetchPages();
    }
  }, [user, loading, router]);

  const fetchPages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/pages", {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const pageMap: Record<string, any> = {};
        (data.pages || []).forEach((p: any) => { pageMap[p.slug] = p; });
        setPages(pageMap);
      }
    } catch (err) {
      console.error("Failed to fetch pages:", err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/pages", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          slug: activeSlug,
          title: title || activeSlug,
          content,
          published: true,
        }),
      });
      if (res.ok) {
        toast.success("Page saved successfully");
        fetchPages();
      } else {
        throw new Error("Failed to save");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const page = pages[activeSlug];
    if (page) {
      setContent(page.content || "");
      setTitle(page.title || activeSlug);
    } else {
      setContent("");
      setTitle(activeSlug);
    }
  }, [activeSlug, pages]);

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
        <h1 className="text-2xl font-bold text-gray-900">CMS Pages</h1>
        <p className="text-gray-500">Edit public-facing pages</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {PAGE_SLUGS.map((slug) => (
          <button
            key={slug}
            onClick={() => setActiveSlug(slug)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSlug === slug
                ? "bg-bdja-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {slug.charAt(0).toUpperCase() + slug.slice(1)}
          </button>
        ))}
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <RichTextEditor value={content} onChange={setContent} />
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Page"}
        </Button>
      </Card>
    </div>
  );
}
