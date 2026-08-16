"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, Search, Clock, User, AlertCircle } from "lucide-react";
import { apiGet } from "@/lib/api-client";

interface AuditLog { id: string; action: string; user_id: string; details: string | null; created_at: string; }

export default function AuditPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && user?.role !== "admin") { router.push("/unauthorized"); return; }
    if (user?.role === "admin") {
      apiGet("/api/admin/audit").then((d) => { setLogs(d.logs || []); setFetching(false); }).catch(() => setFetching(false));
    }
  }, [user, authLoading, router]);

  const filtered = logs.filter((l) =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.details || "").toLowerCase().includes(search.toLowerCase()) ||
    l.user_id.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div></div>;
  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-white flex items-center gap-2"><Shield className="w-6 h-6 text-amber-400" /> Audit Logs</h1><p className="text-gray-400 mt-1">Track all system activities and changes</p></div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search audit logs..." className="flex-1 outline-none text-sm bg-transparent text-white placeholder-gray-500" />
        </div>
        {fetching ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div> :
        filtered.length === 0 ? <div className="text-center py-8 text-gray-500">No audit logs found.</div> :
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700/50"><tr>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Action</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">User</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Details</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Time</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-700/30">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{l.action}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{l.user_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-gray-400">{l.details || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
    </div>
  );
}
