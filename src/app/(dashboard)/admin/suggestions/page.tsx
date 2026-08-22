"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPatch, apiDelete } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Loader2, CheckCircle, Trash2, MessageSquare, Lightbulb, Bug,
  ThumbsUp, Filter, X, Search, ChevronDown, ChevronUp, RefreshCw, Send
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

type StatusFilter = "all" | "open" | "resolved" | "closed";
type TypeFilter = "all" | "feedback" | "bug" | "feature" | "complaint" | "other";

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
  profiles?: { full_name: string; email: string } | null;
}

const TYPE_COLORS: Record<string, string> = {
  feedback: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  bug: "bg-red-500/10 text-red-400 border-red-500/20",
  feature: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  complaint: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  other: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  feedback: <ThumbsUp className="w-3 h-3" />,
  bug: <Bug className="w-3 h-3" />,
  feature: <Lightbulb className="w-3 h-3" />,
  complaint: <MessageSquare className="w-3 h-3" />,
  other: <MessageSquare className="w-3 h-3" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-500/10 text-gray-400",
  medium: "bg-blue-500/10 text-blue-400",
  high: "bg-amber-500/10 text-amber-400",
  critical: "bg-red-500/10 text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-500/10 text-yellow-400",
  under_review: "bg-blue-500/10 text-blue-400",
  resolved: "bg-emerald-500/10 text-emerald-400",
  closed: "bg-gray-500/10 text-gray-400",
};

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [savingResponse, setSavingResponse] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      const data = await apiGet<{ suggestions: Suggestion[] }>(`/api/admin/suggestions?${params.toString()}`);
      setSuggestions(data.suggestions || []);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await apiPatch("/api/admin/suggestions", { id, status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchSuggestions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handlePriorityChange = async (id: string, newPriority: string) => {
    try {
      await apiPatch("/api/admin/suggestions", { id, priority: newPriority });
      toast.success(`Priority updated to ${newPriority}`);
      fetchSuggestions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRespond = async (id: string) => {
    if (!responseText.trim()) {
      toast.error("Response text is required");
      return;
    }
    setSavingResponse(true);
    try {
      await apiPatch("/api/admin/suggestions", { id, admin_response: responseText.trim() });
      toast.success("Response submitted");
      setResponseText("");
      setRespondingId(null);
      fetchSuggestions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingResponse(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this suggestion permanently?")) return;
    try {
      await apiDelete(`/api/admin/suggestions?id=${id}`);
      toast.success("Suggestion deleted");
      fetchSuggestions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const filtered = suggestions.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      (s.profiles?.full_name || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
        <p className="font-medium mb-2">Failed to load suggestions</p>
        <p className="text-sm">{error}</p>
        <Button onClick={fetchSuggestions} className="mt-3" size="sm">
          <RefreshCw className="w-3 h-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Suggestions & Feedback</h1>
        <div className="flex items-center gap-2">
          <Button onClick={fetchSuggestions} variant="outline" size="sm">
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search suggestions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm"
          >
            <option value="all">All Types</option>
            <option value="feedback">Feedback</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="complaint">Complaint</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No suggestions found.</p>
          </div>
        )}
        {filtered.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={TYPE_COLORS[s.type] || TYPE_COLORS.other}>
                    {TYPE_ICONS[s.type] || TYPE_ICONS.other}
                    <span className="ml-1 capitalize">{s.type}</span>
                  </Badge>
                  <Badge className={PRIORITY_COLORS[s.priority || "medium"] || PRIORITY_COLORS.medium}>
                    {s.priority || "medium"}
                  </Badge>
                  <Badge className={STATUS_COLORS[s.status] || STATUS_COLORS.open}>
                    {s.status.replace("_", " ")}
                  </Badge>
                </div>
                <h3 className="font-medium text-white mt-2">{s.title}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  By {s.profiles?.full_name || "Unknown"} · {s.created_at ? new Date(s.created_at).toLocaleString() : "N/A"}
                </p>
                {expandedId === s.id && (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{s.description}</p>
                    {s.admin_response && (
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                        <p className="text-xs text-emerald-400 font-medium mb-1">Admin Response</p>
                        <p className="text-sm text-gray-300">{s.admin_response}</p>
                      </div>
                    )}
                    {respondingId === s.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm resize-y"
                          placeholder="Type your response..."
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleRespond(s.id)} disabled={savingResponse}>
                            {savingResponse ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3 mr-1" /> Submit Response</>}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRespondingId(null); setResponseText(""); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setRespondingId(s.id)}>
                          <Send className="w-3 h-3 mr-1" /> Respond
                        </Button>
                        <select
                          value={s.status}
                          onChange={(e) => handleStatusChange(s.id, e.target.value)}
                          className="px-2 py-1 rounded bg-slate-800 border border-gray-700 text-white text-xs"
                        >
                          <option value="open">Open</option>
                          <option value="under_review">Under Review</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        <select
                          value={s.priority || "medium"}
                          onChange={(e) => handlePriorityChange(s.id, e.target.value)}
                          className="px-2 py-1 rounded bg-slate-800 border border-gray-700 text-white text-xs"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                className="text-gray-400 hover:text-white shrink-0"
              >
                {expandedId === s.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
