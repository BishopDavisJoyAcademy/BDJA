"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  GraduationCap, Users, Eye, EyeOff, Loader2,
  ShieldCheck, Sparkles, ArrowRight, Lock, Mail, Hash
} from "lucide-react";

type LoginRole = "student" | "staff";

interface RoleConfig {
  key: LoginRole;
  label: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  accent: string;
  description: string;
  idLabel: string;
  idPlaceholder: string;
  idType: "email" | "text";
  credentialLabel: string;
  credentialPlaceholder: string;
  showPasswordToggle: boolean;
}

const ROLES: RoleConfig[] = [
  {
    key: "student",
    label: "Student",
    icon: GraduationCap,
    color: "text-emerald-400",
    bgGradient: "from-emerald-500/20 to-teal-500/10",
    accent: "emerald",
    description: "Access your grades, timetable & assignments",
    idLabel: "Admission Number",
    idPlaceholder: "e.g., BDJA-2024-001",
    idType: "text",
    credentialLabel: "PIN",
    credentialPlaceholder: "Enter your 4-8 digit PIN",
    showPasswordToggle: true,
  },
  {
    key: "staff",
    label: "Staff",
    icon: Users,
    color: "text-amber-400",
    bgGradient: "from-amber-500/20 to-orange-500/10",
    accent: "amber",
    description: "Manage classes, grades, attendance & admin",
    idLabel: "Email Address",
    idPlaceholder: "you@bdja.ac.ke",
    idType: "email",
    credentialLabel: "Password",
    credentialPlaceholder: "Enter your password",
    showPasswordToggle: true,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
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

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (user && !authLoading) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const activeRole = ROLES.find((r) => r.key === role)!;
  const RoleIcon = activeRole.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let result: { success: boolean; error: string | null; mustChangePassword?: boolean };

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

      router.replace(redirectTo);
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
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full opacity-10"
            style={{
              width: 200 + i * 100,
              height: 200 + i * 100,
              background: `radial-gradient(circle, ${
                i % 2 === 0 ? "#f59e0b" : "#10b981"
              } 0%, transparent 70%)`,
              left: `${10 + i * 15}%`,
              top: `${10 + i * 12}%`,
            }}
            animate={{
              x: [0, 30, -20, 0],
              y: [0, -30, 20, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Branding */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/10 mb-4 shadow-lg backdrop-blur-sm overflow-hidden">
            <Image
              src="/logo.png"
              alt="Bishop Davis Joy Academy"
              width={64}
              height={64}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            BDJA Platform
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Bishop Davis Joy Academy
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-amber-400/80 font-medium tracking-wide uppercase">
              Prayer, Commitment & Hard Work
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl shadow-black/40 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Role Selector Tabs */}
          <div className="flex border-b border-slate-700/50">
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
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all relative ${
                    isActive ? r.color : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {r.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{
                        backgroundColor:
                          r.accent === "emerald" ? "#34d399" : "#fbbf24",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-6 sm:p-8">
            {/* Role Description */}
            <AnimatePresence mode="wait">
              <motion.div
                key={role}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 mb-6"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeRole.bgGradient} flex items-center justify-center`}
                >
                  <RoleIcon className={`w-5 h-5 ${activeRole.color}`} />
                </div>
                <div>
                  <p className="text-white font-medium">{activeRole.label} Login</p>
                  <p className="text-slate-400 text-xs">{activeRole.description}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={role + "-id"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                    {activeRole.idLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      {role === "student" ? (
                        <Hash className="w-4 h-4" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                    </div>
                    <input
                      type={activeRole.idType}
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      placeholder={activeRole.idPlaceholder}
                      required
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-all"
                    />
                  </div>
                </motion.div>
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={role + "-cred"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
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
                      minLength={role === "student" ? 4 : 8}
                      maxLength={role === "student" ? 8 : 128}
                      pattern={role === "student" ? "^\d+$" : undefined}
                      className="w-full pl-10 pr-12 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-all"
                    />
                    {activeRole.showPasswordToggle && (
                      <button
                        type="button"
                        onClick={() => setShowCredential(!showCredential)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                      >
                        {showCredential ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  {role === "student" && (
                    <p className="text-xs text-slate-500 mt-1">4-8 digits only</p>
                  )}
                </motion.div>
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-slate-700/50 text-center space-y-2">
              <p className="text-xs text-slate-500">
                Forgot your {role === "student" ? "PIN" : "password"}?{" "}
                <a
                  href="/contact"
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Contact administration
                </a>
              </p>
              <p className="text-[10px] text-slate-600">
                Parents can view their child&apos;s progress through the Student portal
              </p>
            </div>
          </div>
        </motion.div>

        {/* Bottom branding */}
        <motion.p
          className="text-center text-slate-600 text-xs mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          &copy; {new Date().getFullYear()} Bishop Davis Joy Academy. All rights
          reserved.
        </motion.p>
      </motion.div>
    </div>
  );
}
