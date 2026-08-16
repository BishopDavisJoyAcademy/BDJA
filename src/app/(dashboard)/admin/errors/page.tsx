"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Bug, CheckCircle, Trash2, Sparkles, AlertTriangle, Clock, User, Globe, Server, RefreshCw, Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import { apiGet, apiPatch, apiDelete, apiPost } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

interface RuntimeErrorLog {
  id: string; message: string; stack?: string; component?: string; url: string;
  user_id?: string; user_email?: string; timestamp: string; resolved: boolean;
  joy_analysis?: string; source: "client" | "server" | "api";
}

export default function ErrorLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<RuntimeErrorLog[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<"all" | "client" | "server" | "api" | "resolved" | "unresolved">("unresolved");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [joyLoading, setJoyLoading] = useState<string | null>(null);

  const fetchErrors = async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (filter === "resolved") params.set("resolved", "true");
      else if (filter === "unresolved") params.set("resolved", "false");
      else if (filter !== "all") params.set("source", filter);
      const d = await apiGet(`/api/admin/errors?${params.toString()}`);
      setErrors(d.errors || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role !== "admin") { router.push("/unauthorized"); return; }
    if (user?.role === "admin") fetchErrors();
  }, [user, authLoading, router, filter]);

  const markResolved = async (id: string) => {
    try {
      await apiPatch("/api/admin/errors", { id, resolved: true });
      setErrors((prev) => prev.map((e) => e.id === id ? { ...e, resolved: true } : e));
      toast.success("Marked as resolved");
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
  };

  const deleteError = async (id: string) => {
    if (!confirm("Delete this error log?")) return;
    try {
      await apiDelete(`/api/admin/errors?id=${id}`);
      setErrors((prev) => prev.filter((e) => e.id !== id));
      toast.success("Deleted");
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
  };

  const askJoy = async (err: RuntimeErrorLog) => {
    setJoyLoading(err.id);
    try {
      const res = await apiPost("/api/chat", {
        messages: [{ role: "user", content: `I am a developer. This runtime error occurred in my Next.js app:

Error: ${getErrorMessage(err)}

Component: ${err.component || "Unknown"}
URL: ${err.url}
Source: ${err.source}
Stack: ${err.stack || "No stack trace"}

Please analyze this error and tell me:
1. What likely caused it
2. How to fix it
3. How to prevent it in the future

Be specific and actionable.` }],
      }) as { message?: string; success?: boolean };
      const analysis = res.message || "Joy could not analyze this error.";
      await apiPatch("/api/admin/errors", { id: err.id, joy_analysis: analysis });
      setErrors((prev) => prev.map((e) => e.id === err.id ? { ...e, joy_analysis: analysis } : e));
      toast.success("Joy has analyzed the error");
    } catch (err: unknown) { toast.error("Joy analysis failed: " + getErrorMessage(err)); } finally { setJoyLoading(null); }
  };

  const sourceIcons = { client: Globe, server: Server, api: AlertTriangle };
  const sourceColors = { client: "text-blue-400 bg-blue-500/10 border-blue-500/20", server: "text-violet-400 bg-violet-500/10 border-violet-500/20", api: "text-amber-400 bg-amber-500/10 border-amber-500/20" };

  if (authLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div></div>;
  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Bug className="w-7 h-7 text-red-400" /> Error Logs</h1>
          <p className="text-gray-400 mt-1">{errors.filter((e) => !e.resolved).length} unresolved errors</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchErrors} className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-gray-400 hover:text-white hover:border-slate-600 transition-all"><RefreshCw className="w-4 h-4" /></button>
          {(["all", "unresolved", "resolved", "client", "server", "api"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter === f ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800/50 text-gray-400 border border-slate-700 hover:border-slate-600"}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {fetching ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div>
        ) : errors.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 border border-slate-700/30 rounded-2xl">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <p className="text-gray-400">No errors found. Everything looks good!</p>
          </div>
        ) : (
          errors.map((err) => {
            const SourceIcon = sourceIcons[err.source] || AlertTriangle;
            const isExpanded = expanded === err.id;
            return (
              <div key={err.id} className={`bg-slate-800/50 border rounded-2xl overflow-hidden transition-all ${err.resolved ? "border-slate-700/30 opacity-60" : "border-slate-700/50"}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${sourceColors[err.source] || sourceColors.api}`}>
                        <SourceIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{getErrorMessage(err)}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(err.timestamp).toLocaleString()}</span>
                          {err.component && <span className="text-xs text-gray-500 font-mono">{err.component}</span>}
                          {err.user_email && <span className="text-xs text-gray-500 flex items-center gap-1"><User className="w-3 h-3" />{err.user_email}</span>}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase border ${err.resolved ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>{err.resolved ? "Resolved" : "Open"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!err.resolved && (
                        <button onClick={() => askJoy(err)} disabled={joyLoading === err.id} className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-all" title="Ask Joy what to do">
                          {joyLoading === err.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        </button>
                      )}
                      {!err.resolved && (
                        <button onClick={() => markResolved(err.id)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all" title="Mark resolved">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => deleteError(err.id)} className="p-2 rounded-lg bg-slate-700/30 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setExpanded(isExpanded ? null : err.id)} className="p-2 rounded-lg bg-slate-700/30 text-gray-400 hover:text-white transition-all">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3">
                      {err.url && <p className="text-xs text-gray-500"><span className="font-medium">URL:</span> {err.url}</p>}
                      {err.stack && (
                        <details open>
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 font-medium">Stack Trace</summary>
                          <pre className="mt-2 text-xs text-gray-500 bg-slate-900/50 rounded-xl p-4 overflow-auto max-h-48 font-mono border border-slate-700/30">{err.stack}</pre>
                        </details>
                      )}
                      {err.joy_analysis && (
                        <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl p-4">
                          <p className="text-xs text-violet-400 font-medium mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Joy's Analysis</p>
                          <div className="text-sm text-gray-300 whitespace-pre-wrap">{err.joy_analysis}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
