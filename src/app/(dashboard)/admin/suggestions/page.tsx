"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  admin_response?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    user_category: string;
  };
}

export default function SuggestionsManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && user?.user_category !== "admin") {
      router.push("/unauthorized");
      return;
    }
    if (user?.user_category === "admin") {
      fetchSuggestions();
    }
  }, [user, loading, router]);

  const fetchSuggestions = async () => {
    try {
      const url = filter !== "all" ? `/api/admin/suggestions?status=${filter}` : "/api/admin/suggestions";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/admin/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast.success("Status updated");
        fetchSuggestions();
      }
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug": return <XCircle className="w-4 h-4 text-red-500" />;
      case "improvement": return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
      planned: "bg-purple-100 text-purple-800",
      implemented: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
      closed: "bg-gray-100 text-gray-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${variants[status] || variants.open}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  if (loading || isLoading) {
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
        <h1 className="text-2xl font-bold text-gray-900">Suggestions & Feedback</h1>
        <p className="text-gray-500">Review and manage user submissions</p>
      </div>

      <div className="flex gap-2">
        {["all", "open", "under_review", "planned", "implemented", "declined"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s ? "bg-bdja-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {suggestions.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No suggestions found</p>
          </Card>
        ) : (
          suggestions.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getTypeIcon(s.type)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{s.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>by {s.profiles?.full_name || "Unknown"}</span>
                      <span>{s.profiles?.user_category}</span>
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(s.status)}
                  <div className="flex gap-1 mt-2">
                    {s.status !== "implemented" && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(s.id, "implemented")}>
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      </Button>
                    )}
                    {s.status !== "declined" && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(s.id, "declined")}>
                        <XCircle className="w-3 h-3 text-red-600" />
                      </Button>
                    )}
                    {s.status !== "under_review" && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(s.id, "under_review")}>
                        <Clock className="w-3 h-3 text-blue-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {s.admin_response && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <span className="font-medium text-gray-700">Admin Response:</span>
                  <p className="text-gray-600 mt-1">{s.admin_response}</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
