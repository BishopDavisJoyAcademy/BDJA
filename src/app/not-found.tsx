"use client";

import { motion } from "framer-motion";
import { Search, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-slate-800/30 border border-slate-700/30 flex items-center justify-center mx-auto mb-6">
          <Search className="w-8 h-8 text-slate-500" />
        </div>
        <h1 className="text-5xl font-semibold text-white mb-2">404</h1>
        <p className="text-lg text-slate-300 mb-1">Page not found</p>
        <p className="text-sm text-slate-500 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium rounded-xl text-sm transition-colors"
          >
            <Home className="w-4 h-4" /> Back to Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
