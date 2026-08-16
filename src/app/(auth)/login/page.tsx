"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, GraduationCap } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const result = await signIn(email, password);
      if (result?.requiresPasswordChange) { router.push("/change-password"); return; }
      if (result?.user?.user_category === "admin") { router.push(`/${ADMIN_SEGMENT}`); return; }
      if (result?.user?.user_category === "staff") { router.push("/teacher"); return; }
      if (result?.user?.user_category === "student") { router.push("/student"); return; }
      if (result?.user?.user_category === "parent") { router.push("/parent"); return; }
      router.push("/");
    } catch (err: unknown) { setError(getErrorMessage(err) || "Invalid credentials"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Gold accent top bar */}
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600" />
          <div className="p-8 space-y-6">
            {/* Logo */}
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center overflow-hidden">
                <Image src="/logo.png" alt="BDJA Logo" width={64} height={64} className="object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; const parent = (e.target as HTMLImageElement).parentElement; if (parent) { parent.innerHTML = '<div class="text-amber-400 font-bold text-xl">BDJA</div>'; } }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Bishop Davis Joy Academy</h1>
                <p className="text-sm text-amber-400/80 mt-1 font-medium">Excellence in Education</p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />{error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all text-sm" placeholder="you@bdja.ac.ke" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-11 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all text-sm" placeholder="Enter your password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-600 text-amber-500 bg-slate-900 focus:ring-amber-500/20" />
                  <span className="text-gray-400">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">Forgot password?</Link>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white font-semibold hover:from-amber-600 hover:via-yellow-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="text-center text-xs text-gray-500">
              <p>Need help? Contact <span className="text-amber-400/70">support@bdja.ac.ke</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
