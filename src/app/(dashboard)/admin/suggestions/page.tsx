"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Loader2, CheckCircle, Trash2, MessageSquare, Send, Lightbulb, Bug,
  ThumbsUp, Filter, X, Search, ChevronDown, ChevronUp, RefreshCw
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
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-red-500/10 text-red-400",
  urgent: "bg-purple-500/10 text-purple-400",
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

  // Submit form state
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    type: "feedback" as TypeFilter,
    title: "",
    description: "",
    priority: "medium" as string,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<{ suggestions: Suggestion[] }>("/api/suggestions");
      setSuggestions(data.suggestions || []);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  const handleResolve = async (id: string) => {
    try {
      await apiPatch("/api/suggestions", { id, status: "resolved" });
      setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: "resolved" } : s));
      toast.success("Suggestion resolved");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleClose = async (id: string) => {
    try {
      await apiPatch("/api/suggestions", { id, status: "closed" });
      setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: "closed" } : s));
      toast.success("Suggestion closed");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleReopen = async (id: string) => {
    try {
      await apiPatch("/api/suggestions", { id, status: "open" });
      setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: "open" } : s));
      toast.success("Suggestion reopened");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this suggestion permanently?")) return;
    try {
      await apiDelete(`/api/suggestions?id=${id}`);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Suggestion deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRespond = async (id: string) => {
    if (!responseText.trim()) {
      toast.error("Response cannot be empty");
      return;
    }
    try {
      await apiPatch("/api/suggestions", { id, admin_response: responseText.trim() });
      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, admin_response: responseText.trim() } : s))
      );
      setRespondingId(null);
      setResponseText("");
      toast.success("Response saved");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitForm.title.trim() || !submitForm.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/suggestions", {
        title: submitForm.title.trim(),
        description: submitForm.description.trim(),
        type: submitForm.type,
        priority: submitForm.priority,
      });
      toast.success("Suggestion submitted successfully");
      setShowSubmitForm(false);
      setSubmitForm({ type: "feedback", title: "", description: "", priority: "medium" });
      fetchSuggestions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = suggestions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      (s.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesType = typeFilter === "all" || s.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: suggestions.length,
    open: suggestions.filter((s) => s.status === "open").length,
    resolved: suggestions.filter((s) => s.status === "resolved").length,
    closed: suggestions.filter((s) => s.status === "closed").length,
  };

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
        <div className="flex items-center gap-2 mb-2">
          <X className="w-4 h-4" />
          <span className="font-medium">Failed to load suggestions</span>
        </div>
        <p className="text-sm">{error}</p>
        <Button onClick={fetchSuggestions} className="mt-3" size="sm">
          <RefreshCw className="w-3 h-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Suggestions & Feedback</h1>
          <p className="text-sm text-gray-400 mt-1">Manage user feedback, bug reports, and feature requests</p>
        </div>
        <Button onClick={() => setShowSubmitForm((p) => !p)}>
          <MessageSquare className="w-4 h-4 mr-2" />
          {showSubmitForm ? "Cancel" : "Submit Suggestion"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Open", value: stats.open, color: "text-amber-400" },
          { label: "Resolved", value: stats.resolved, color: "text-emerald-400" },
          { label: "Closed", value: stats.closed, color: "text-gray-400" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <p className="text-2xl font-bold {stat.color}">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Submit Form */}
      {showSubmitForm && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-amber-400" />
            Submit New Suggestion
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Type</label>
                <select
                  value={submitForm.type}
                  onChange={(e) => setSubmitForm((p) => ({ ...p, type: e.target.value as TypeFilter }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm"
                >
                  <option value="feedback">Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="complaint">Complaint</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Priority</label>
                <select
                  value={submitForm.priority}
                  onChange={(e) => setSubmitForm((p) => ({ ...p, priority: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Title</label>
              <Input
                value={submitForm.title}
                onChange={(e) => setSubmitForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Short summary of your suggestion..."
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Description</label>
              <textarea
                value={submitForm.description}
                onChange={(e) => setSubmitForm((p) => ({ ...p, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm focus:ring-2 focus:ring-amber-400 outline-none resize-y"
                placeholder="Describe your suggestion in detail..."
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Submit
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowSubmitForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
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
            <option value="all">All Status</option>
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

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No suggestions found.</p>
            <p className="text-sm">{search || statusFilter !== "all" || typeFilter !== "all" ? "Try adjusting your filters." : "Be the first to submit a suggestion!"}</p>
          </div>
        ) : (
          filtered.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={TYPE_COLORS[s.type] || TYPE_COLORS.other}>
                        <span className="flex items-center gap-1">
                          {TYPE_ICONS[s.type] || TYPE_ICONS.other}
                          {s.type}
                        </span>
                      </Badge>
                      <Badge variant={s.status === "resolved" ? "success" : s.status === "closed" ? "default" : "warning"}>
                        {s.status}
                      </Badge>
                      {s.priority && (
                        <Badge className={PRIORITY_COLORS[s.priority] || PRIORITY_COLORS.medium}>
                          {s.priority}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-white">{s.title}</h3>
                    <p className="text-sm text-gray-400 line-clamp-1">{s.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span>By {s.profiles?.full_name || "Anonymous"}</span>
                      <span>•</span>
                      <span>{s.created_at ? new Date(s.created_at).toLocaleDateString() : "Unknown date"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {expandedId === s.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
              </div>

              {expandedId === s.id && (
                <div className="px-4 pb-4 border-t border-gray-700/50 pt-3 space-y-3">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{s.description}</p>

                  {s.admin_response && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-emerald-400 mb-1">Admin Response</p>
                      <p className="text-sm text-gray-300">{s.admin_response}</p>
                    </div>
                  )}

                  {/* Admin Actions */}
                  <div className="flex flex-wrap gap-2">
                    {s.status === "open" && (
                      <>
                        <Button size="sm" onClick={() => handleResolve(s.id)}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Resolve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleClose(s.id)}>
                          <X className="w-3 h-3 mr-1" /> Close
                        </Button>
                      </>
                    )}
                    {(s.status === "resolved" || s.status === "closed") && (
                      <Button size="sm" variant="outline" onClick={() => handleReopen(s.id)}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Reopen
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRespondingId(respondingId === s.id ? null : s.id);
                        setResponseText(s.admin_response || "");
                      }}
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      {respondingId === s.id ? "Cancel" : s.admin_response ? "Edit Response" : "Respond"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>

                  {respondingId === s.id && (
                    <div className="space-y-2">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm focus:ring-2 focus:ring-amber-400 outline-none resize-y"
                        placeholder="Write your response..."
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleRespond(s.id)}>
                          <Send className="w-3 h-3 mr-1" /> Save Response
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRespondingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
