"use client";

import { motion } from "framer-motion";
import { Compass, Home, ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-500/[0.03] blur-3xl rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center relative z-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="w-16 h-16 rounded-2xl bg-slate-800/40 border border-slate-700/30 flex items-center justify-center mx-auto mb-6 overflow-hidden"
        >
          <Image src="/logo.png" alt="BDJA" width={44} height={44} className="object-contain" />
        </motion.div>

        {/* 404 with decorative elements */}
        <div className="relative inline-block mb-4">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-7xl font-bold text-white tracking-tighter"
          >
            4<span className="text-amber-400">0</span>4
          </motion.h1>
          <motion.div
            className="absolute -top-1 -right-4 w-3 h-3 rounded-full bg-amber-400/60"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-white mb-1">Page not found</h2>
          <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto">
            The page you are looking for does not exist or may have been moved to a new location.
          </p>
        </motion.div>

        {/* Suggested links */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-8"
        >
          {[
            { label: "Home", href: "/" },
            { label: "About", href: "/about" },
            { label: "Admissions", href: "/admissions" },
            { label: "Contact", href: "/contact" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-xs text-slate-400 bg-slate-800/30 border border-slate-700/30 rounded-lg hover:text-amber-400 hover:border-amber-500/20 transition-all"
            >
              {link.label}
            </Link>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors"
          >
            <Home className="w-4 h-4" /> Back to Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </motion.div>

        {/* School name */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-10 text-xs text-slate-600"
        >
          Bishop Davis Joy Academy &middot; Excellence in Education
        </motion.p>
      </motion.div>
    </div>
  );
}
