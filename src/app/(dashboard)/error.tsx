"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-bdja-danger mx-auto mb-4" />
        <h2 className="text-xl font-bold text-bdja-dark mb-2">Page Error</h2>
        <p className="text-gray-500 mb-6">{error.message || "Failed to load this page."}</p>
        <Button onClick={reset} variant="primary">Try Again</Button>
      </div>
    </div>
  );
}
