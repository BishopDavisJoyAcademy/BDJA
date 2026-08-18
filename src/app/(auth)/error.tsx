"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

const GOLD = "#D4AF37";

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Auth error:", error); }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Authentication Error</h2>
        <p className="text-sm text-slate-400 mb-5">{error.message || "Something went wrong during authentication."}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={reset} className="inline-flex items-center gap-2 px-4 py-2 text-slate-950 font-medium rounded-xl text-sm transition-colors hover:opacity-90" style={{ background: GOLD }}>
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl text-sm transition-colors">
            <Home className="w-4 h-4" /> Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
