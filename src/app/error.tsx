"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-red-500/8 border border-red-500/15 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-slate-400 mb-1">
          {error.message || "We encountered an unexpected error while loading this page."}
        </p>
        {error.digest && (
          <p className="text-[10px] text-slate-600 font-mono mb-6">Error ID: {error.digest}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium rounded-xl text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl text-sm transition-colors"
          >
            <Home className="w-4 h-4" /> Go Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
