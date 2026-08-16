"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, MessageSquare, Send, Loader2, Filter } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

interface Suggestion {
  id: string; title: string; description: string; type: string; status: string; priority: string;
  admin_response?: string; profiles?: { full_name: string }; created_at: string;
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    apiGet("/api/suggestions").then((d) => { setSuggestions(d.suggestions || []); setLoading(false); }).catch((err) => { setError(getErrorMessage(err)); setLoading(false); });
  }, []);

  const handleRespond = async (id: string) => {
    try {
      await apiPatch("/api/suggestions", { id, admin_response: responseText, status: "implemented" });
      setResponding(null); setResponseText("");
      const d = await apiGet("/api/suggestions");
      setSuggestions(d.suggestions || []);
      toast.success("Response saved");
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
  };

  const filtered = statusFilter === "all" ? suggestions : suggestions.filter((s) => s.status === statusFilter);

  const statusColors: Record<string, string> = {
    open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    under_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    planned: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    implemented: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    declined: "bg-red-500/10 text-red-400 border-red-500/20",
    closed: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  const priorityColors: Record<string, string> = {
    low: "text-gray-400", medium: "text-amber-400", high: "text-orange-400", critical: "text-red-400",
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div></div>;
  if (error) return <div className="p-4 bg-red-500/10 text-red-400 rounded-xl flex items-center gap-2 border border-red-500/20"><AlertCircle className="w-5 h-5" />{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-white">Suggestions & Feedback</h1><p className="text-gray-400 mt-1">{suggestions.length} submissions</p></div>
        <div className="flex gap-2">
          {["all","open","under_review","implemented"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${statusFilter===s ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800/50 text-gray-400 border border-slate-700 hover:border-slate-600"}`}>{s.replace("_", " ")}</button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {filtered.map((s) => (
          <div key={s.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white text-lg">{s.title}</h3>
                <p className="text-sm text-gray-400 mt-1">By {s.profiles?.full_name || "Anonymous"} · {new Date(s.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[s.status] || statusColors.closed}`}>{s.status.replace("_", " ")}</span>
                <span className={`text-xs font-medium capitalize ${priorityColors[s.priority] || "text-gray-400"}`}>{s.priority}</span>
              </div>
            </div>
            <p className="text-gray-300 text-sm">{s.description}</p>
            {s.admin_response && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                <p className="text-xs text-emerald-400 font-medium mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Admin Response</p>
                <p className="text-sm text-gray-300">{s.admin_response}</p>
              </div>
            )}
            {responding === s.id ? (
              <div className="space-y-3">
                <textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 text-sm" placeholder="Write your response..." />
                <div className="flex gap-2">
                  <button onClick={() => handleRespond(s.id)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center gap-2"><Send className="w-3 h-3" /> Send Response</button>
                  <button onClick={() => { setResponding(null); setResponseText(""); }} className="px-4 py-2 rounded-xl border border-slate-600 text-gray-300 text-sm font-medium hover:bg-slate-700/50 transition-all">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setResponding(s.id); setResponseText(s.admin_response || ""); }} className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"><MessageSquare className="w-4 h-4" /> Respond</button>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-gray-500"><p>No suggestions in this category.</p></div>}
      </div>
    </div>
  );
}
