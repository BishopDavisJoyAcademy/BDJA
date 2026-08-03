"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff, School, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";

function getDashboardPath(role: string | null): string {
  switch (role) {
    case "student": return "/student";
    case "parent": return "/parent";
    case "teacher": return "/teacher";
    case "principal":
    case "super_admin": return "/admin";
    case "bursar": return "/bursar";
    case "librarian": return "/librarian";
    default: return "/student";
  }
}

async function fetchProfile(token: string) {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to load user profile");
  }
  return res.json();
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = searchParams.get("portal");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled || !session?.user) {
        setChecking(false);
        return;
      }

      try {
        const { profile } = await fetchProfile(session.access_token);
        if (!profile.password_changed) {
          router.replace("/reset-password?first=true");
          return;
        }
        if (!profile.onboarding_completed) {
          router.replace("/onboarding");
          return;
        }
        router.replace(getDashboardPath(profile.role));
      } catch {
        setChecking(false);
      }
    });

    return () => { cancelled = true; };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user || !data.session) {
        throw new Error("Login succeeded but no session returned");
      }

      const { profile } = await fetchProfile(data.session.access_token);

      if (!profile.password_changed) {
        router.push("/reset-password?first=true");
        return;
      }
      if (!profile.onboarding_completed) {
        router.push("/onboarding");
        return;
      }

      router.push(getDashboardPath(profile.role));
    } catch (error: any) {
      console.error("[login] Error:", error);
      toast.error(error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const portalLabel =
    portal === "student"
      ? "Student Portal"
      : portal === "staff"
      ? "Staff Portal"
      : "BDJA Platform";

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
        <div className="text-white text-sm animate-pulse">Checking session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#1e3a5f]">
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <Image src="/logo.png" alt="BDJA Logo" width={600} height={600} className="object-contain opacity-10" priority />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f]/95 via-[#2d5a87]/90 to-[#1e3a5f]/95 z-[1]" />
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#1e3a5f] mb-4 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Back to Home
            </Link>
            <div className="w-20 h-20 mx-auto mb-4 bg-[#1e3a5f] rounded-xl flex items-center justify-center shadow-lg">
              <School className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1e3a5f]">{portalLabel}</h1>
            <p className="text-sm text-gray-500 mt-1">Bishop Davis Joy Academy</p>
            <p className="text-xs text-[#c9a227] mt-2 font-medium">&ldquo;Prayer, Commitment and Hard Work for Success&rdquo;</p>
            {errorParam === "suspended" && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded-lg">Your account has been suspended. Contact the administrator.</p>
            )}
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <Input type="email" placeholder="you@bdja.ac.ke" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full py-3 bg-[#1e3a5f] hover:bg-[#2d5a87] text-white font-medium rounded-xl transition-all">
              {loading ? "Signing in..." : `Sign In to ${portalLabel}`}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">Need help? <Link href="/contact" className="text-[#c9a227] hover:underline">Contact us</Link></p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">&copy; 2026 Bishop Davis Joy Academy. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
