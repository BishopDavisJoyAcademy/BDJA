"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  is_published: boolean | null;
  updated_at: string | null;
}

export default function PagesPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ pages: CmsPage[] }>("/api/admin/pages")
      .then((d) => { setPages(d.pages || []); setLoading(false); })
      .catch((err) => { setError(getErrorMessage(err)); setLoading(false); });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    try {
      await fetch(`/api/admin/pages?id=${id}`, { method: "DELETE" });
      setPages((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;
  if (error) return <div className="p-4 bg-red-500/10 text-red-400 rounded-xl">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">CMS Pages</h1>
        <Link href="/admin/pages/new">
          <Button><Plus className="w-4 h-4 mr-2" />New Page</Button>
        </Link>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {pages.map((page) => (
              <tr key={page.id} className="text-gray-300">
                <td className="px-4 py-3">{page.title}</td>
                <td className="px-4 py-3">/{page.slug}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${page.is_published ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"}`}>
                    {page.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/pages/edit/${page.id}`} className="text-amber-400 hover:text-amber-300 mr-3">
                    <Pencil className="w-4 h-4 inline" />
                  </Link>
                  <button onClick={() => handleDelete(page.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
