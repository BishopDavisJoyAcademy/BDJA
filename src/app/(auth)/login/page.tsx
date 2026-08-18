"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  GraduationCap, Users, Eye, EyeOff, Loader2,
  ShieldCheck, Sparkles, ArrowRight, Lock, Mail, Hash,
  ArrowUpRight, BookOpen
} from "lucide-react";

type LoginRole = "student" | "staff";

interface RoleConfig {
  key: LoginRole;
  label: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  bgTint: string;
  description: string;
  idLabel: string;
  idPlaceholder: string;
  idType: "email" | "text";
  credentialLabel: string;
  credentialPlaceholder: string;
}

const ROLES: RoleConfig[] = [
  {
    key: "student",
    label: "Student",
    icon: GraduationCap,
    color: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgTint: "bg-emerald-500/10",
    description: "Access your grades, timetable & assignments",
    idLabel: "Admission Number",
    idPlaceholder: "BDJA/0001/2025",
    idType: "text",
    credentialLabel: "Security PIN",
    credentialPlaceholder: "Enter your 4-8 digit PIN",
  },
  {
    key: "staff",
    label: "Staff",
    icon: Users,
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgTint: "bg-amber-500/10",
    description: "Manage classes, grades, attendance & admin",
    idLabel: "Official Email",
    idPlaceholder: "you@bdja.ac.ke",
    idType: "email",
    credentialLabel: "Password",
    credentialPlaceholder: "Enter your password",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { signIn, signInStudent, user, loading: authLoading } = useAuth();

  const [role, setRole] = useState<LoginRole>("student");
  const [id, setId] = useState("");
  const [credential, setCredential] = useState("");
  const [showCredential, setShowCredential] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (user && !authLoading) {
      const dest = redirectParam || "/dashboard";
      router.replace(dest);
    }
  }, [user, authLoading, router, redirectParam]);

  const activeRole = ROLES.find((r) => r.key === role)!;
  const RoleIcon = activeRole.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let result: { success: boolean; error: string | null; mustChangePassword?: boolean; redirectTo?: string };

      if (role === "student") {
        result = await signInStudent(id, credential);
      } else {
        result = await signIn(id, credential);
      }

      if (!result.success) {
        setError(result.error || "Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }

      if (result.mustChangePassword) {
        const type = role === "student" ? "student" : "staff";
        router.replace(`/reset-password?first=true&type=${type}`);
        return;
      }

      // Use the redirect from auth result or param
      const dest = redirectParam || result.redirectTo || "/dashboard";
      router.replace(dest);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center px-4 py-8">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Already signed in banner */}
        <AnimatePresence>
          {user && !authLoading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-sm text-emerald-300">
                  Signed in as <span className="font-medium">{user.full_name || user.email}</span>
                </p>
              </div>
              <button
                onClick={() => router.replace("/dashboard")}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
              >
                Dashboard <ArrowUpRight className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Brand */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-4 overflow-hidden">
            <Image
              src="/logo.png"
              alt="Bishop Davis Joy Academy"
              width={52}
              height={52}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            BDJA Portal
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Bishop Davis Joy Academy
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <BookOpen className="w-3 h-3 text-amber-400/70" />
            <span className="text-[11px] text-amber-400/60 font-medium tracking-wide uppercase">
              Prayer, Commitment & Hard Work
            </span>
            <BookOpen className="w-3 h-3 text-amber-400/70" />
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/40 shadow-xl overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          {/* Tabs */}
          <div className="flex border-b border-slate-700/40">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const isActive = role === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => {
                    setRole(r.key);
                    setId("");
                    setCredential("");
                    setError("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all relative ${
                    isActive ? r.color : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {r.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-4 right-4 h-0.5 bg-current rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-6 sm:p-7">
            {/* Role header */}
            <AnimatePresence mode="wait">
              <motion.div
                key={role}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 mb-5"
              >
                <div className={`w-9 h-9 rounded-lg ${activeRole.bgTint} border ${activeRole.borderColor} flex items-center justify-center`}>
                  <RoleIcon className={`w-4.5 h-4.5 ${activeRole.color}`} />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{activeRole.label} portal</p>
                  <p className="text-slate-500 text-xs">{activeRole.description}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="p-3 bg-red-500/8 border border-red-500/15 rounded-xl flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={role + "-id"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                    {activeRole.idLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      {role === "student" ? <Hash className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    </div>
                    <input
                      type={activeRole.idType}
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      placeholder={activeRole.idPlaceholder}
                      required
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500/40 transition-all"
                    />
                  </div>
                  {role === "student" && (
                    <p className="text-[11px] text-slate-600 mt-1">Format: BDJA/XXXX/YYYY</p>
                  )}
                </motion.div>
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={role + "-cred"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, delay: 0.04 }}
                >
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                    {activeRole.credentialLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showCredential ? "text" : "password"}
                      value={credential}
                      onChange={(e) => setCredential(e.target.value)}
                      placeholder={activeRole.credentialPlaceholder}
                      required
                      minLength={role === "student" ? 4 : 1}
                      maxLength={role === "student" ? 8 : 128}
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredential(!showCredential)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showCredential ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {role === "student" && (
                    <p className="text-[11px] text-slate-600 mt-1">Numbers only, 4–8 digits</p>
                  )}
                  {role === "staff" && (
                    <p className="text-[11px] text-slate-600 mt-1">Case-sensitive</p>
                  )}
                </motion.div>
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1 text-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Sign in as {role}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-slate-700/30 text-center space-y-1.5">
              <p className="text-xs text-slate-500">
                Forgot your {role === "student" ? "PIN" : "password"}?{" "}
                <a href="/contact" className="text-amber-400/80 hover:text-amber-400 transition-colors">
                  Contact administration
                </a>
              </p>
              <p className="text-[10px] text-slate-600">
                Parents can view their child&apos;s progress through the Student portal
              </p>
            </div>
          </div>
        </motion.div>

        <motion.p
          className="text-center text-slate-600 text-xs mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          &copy; {new Date().getFullYear()} Bishop Davis Joy Academy. All rights reserved.
        </motion.p>
      </motion.div>
    </div>
  );
}
