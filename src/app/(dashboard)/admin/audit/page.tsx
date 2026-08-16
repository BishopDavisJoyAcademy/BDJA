"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Loader2 } from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  new_data: Record<string, unknown> | null;
  old_data: Record<string, unknown> | null;
  created_at: string | null;
  ip_address: string | null;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    apiGet<{ logs: AuditLog[] }>("/api/admin/audit")
      .then((d) => { setLogs(d.logs || []); setFetching(false); })
      .catch(() => setFetching(false));
  }, []);

  if (fetching) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Table</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.map((log) => (
              <tr key={log.id} className="text-gray-300">
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">{log.table_name || "-"}</td>
                <td className="px-4 py-3">{log.user_id || "-"}</td>
                <td className="px-4 py-3">{log.created_at ? new Date(log.created_at).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
