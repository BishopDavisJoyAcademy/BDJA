"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Loader2, AlertCircle } from "lucide-react";

interface RuntimeError {
  id: string;
  message: string;
  component: string | null;
  source: string;
  resolved: boolean;
  timestamp: string;
  user_email: string | null;
}

export default function ErrorsPage() {
  const [errors, setErrors] = useState<RuntimeError[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ errors: RuntimeError[] }>("/api/admin/errors")
      .then((d) => { setErrors(d.errors || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Runtime Errors</h1>
      {errors.length === 0 ? (
        <div className="text-gray-400 text-center py-12">No errors logged.</div>
      ) : (
        <div className="space-y-3">
          {errors.map((err) => (
            <Card key={err.id} className={`p-4 ${err.resolved ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-medium">{err.message}</p>
                  <p className="text-sm text-gray-400 mt-1">{err.component || err.source} — {new Date(err.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
