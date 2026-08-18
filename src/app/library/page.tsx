"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { BookOpen, Search, Loader2, ExternalLink } from "lucide-react";

interface LibraryResource {
  id: string;
  title: string;
  author: string | null;
  resource_type: string;
  cover_url: string | null;
  file_url: string | null;
  grade_levels: string[] | null;
}

export default function PublicLibrary() {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchResources();
  }, []);

  async function fetchResources() {
    try {
      setFetching(true);
      const res = await fetch("/api/library");
      const data = await res.json();
      setResources(data.resources || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }

  const filtered = resources.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || (r.author || "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || r.resource_type === filter;
    return matchesSearch && matchesFilter;
  });

  const typeCounts: Record<string, number> = {};
  resources.forEach((r) => {
    typeCounts[r.resource_type] = (typeCounts[r.resource_type] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">School Library</h1>
          <p className="text-gray-500 mt-2">Browse books, e-books, videos, and worksheets</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources..." className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-300"}`}>All ({resources.length})</button>
            {Object.entries(typeCounts).map(([type, count]) => (
              <button key={type} onClick={() => setFilter(type)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === type ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-300"}`}>{type} ({count})</button>
            ))}
          </div>
        </div>

        {fetching ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-gray-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No resources found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((r) => (
              <Card key={r.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {r.cover_url ? (
                  <Image src={r.cover_url || ""} alt={r.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 300px" />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <div className="p-4">
                  <span className="text-xs font-medium text-blue-600 uppercase">{r.resource_type}</span>
                  <h3 className="font-semibold text-gray-900 mt-1">{r.title}</h3>
                  <p className="text-sm text-gray-500">{r.author || "Unknown author"}</p>
                  {r.grade_levels && <p className="text-xs text-gray-400 mt-2">Grades: {r.grade_levels.join(", ")}</p>}
                  {r.file_url && (
                    <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                      <ExternalLink className="w-3 h-3" /> Open Resource
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
