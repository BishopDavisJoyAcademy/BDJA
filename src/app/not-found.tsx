"use client";

import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const GOLD = "#D4AF37";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${GOLD}06 0%, transparent 70%)`, filter: "blur(80px)" }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-md w-full text-center relative z-10">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }} className="w-16 h-16 rounded-2xl bg-slate-800/40 border border-slate-700/30 flex items-center justify-center mx-auto mb-6 overflow-hidden">
          <Image src="/logo.png" alt="BDJA" width={44} height={44} className="object-contain" />
        </motion.div>

        <div className="relative inline-block mb-4">
          <motion.h1 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.4 }} className="text-7xl font-bold text-white tracking-tighter">
            4<span style={{ color: GOLD }}>0</span>4
          </motion.h1>
          <motion.div className="absolute -top-1 -right-4 w-3 h-3 rounded-full" style={{ background: GOLD, opacity: 0.6 }} animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-lg font-semibold text-white mb-1">Page not found</h2>
          <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto">The page you are looking for does not exist or may have been moved to a new location.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {["Home", "About", "Admissions", "Contact"].map((label) => (
            <Link key={label} href={`/${label.toLowerCase()}`} className="px-3 py-1.5 text-xs text-slate-400 bg-slate-800/30 border border-slate-700/30 rounded-lg hover:text-[#D4AF37] hover:border-[#D4AF37]/20 transition-all">
              {label}
            </Link>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 text-slate-950 font-semibold rounded-xl text-sm transition-colors hover:opacity-90" style={{ background: GOLD }}>
            <Home className="w-4 h-4" /> Back to Home
          </Link>
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-10 text-xs text-slate-600">
          Bishop Davis Joy Academy &middot; Excellence in Education
        </motion.p>
      </motion.div>
    </div>
  );
}
