"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string | null;
  status: string;
  user_id: string;
  admin_response: string | null;
  created_at: string | null;
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ suggestions: Suggestion[] }>("/api/suggestions")
      .then((d) => { setSuggestions(d.suggestions || []); setLoading(false); })
      .catch((err) => { setError(getErrorMessage(err)); setLoading(false); });
  }, []);

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch("/api/suggestions", {
        method: "PATCH",
        body: JSON.stringify({ id, status: "resolved" }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to resolve");
      setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: "resolved" } : s));
      toast.success("Suggestion resolved");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this suggestion?")) return;
    try {
      const res = await fetch(`/api/suggestions?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Suggestion deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;
  if (error) return <div className="p-4 bg-red-500/10 text-red-400 rounded-xl">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Suggestions</h1>
      {suggestions.length === 0 ? (
        <div className="text-gray-400 text-center py-12">No suggestions yet.</div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-white">{s.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{s.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${s.status === "resolved" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                      {s.status}
                    </span>
                    <span className="text-xs text-gray-500">{s.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.status !== "resolved" && (
                    <Button size="sm" variant="ghost" onClick={() => handleResolve(s.id)}>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
