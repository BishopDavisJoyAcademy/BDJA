"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff, School, ArrowLeft, ShieldAlert, Lock, UserX, RefreshCw, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";

interface ErrorConfig {
  icon: React.ReactNode;
  title: string;
  message: string;
  color: string;
  bgColor: string;
  recoverable: boolean;
  showRecovery?: boolean;
}

const ERROR_CONFIGS: Record<string, ErrorConfig> = {
  suspended: {
    icon: <ShieldAlert className="w-5 h-5" />,
    title: "Account Suspended",
    message: "Your account has been suspended by an administrator. Please contact the school office for assistance.",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    recoverable: false,
  },
  profile_missing: {
    icon: <UserX className="w-5 h-5" />,
    title: "Profile Missing",
    message: "Your account profile could not be found. This may be due to a system error during account creation.",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    recoverable: true,
    showRecovery: true,
  },
  account_locked: {
    icon: <Lock className="w-5 h-5" />,
    title: "Account Locked",
    message: "Too many failed login attempts. Your account is temporarily locked for security.",
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
    recoverable: true,
  },
  invalid_credentials: {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "Invalid Credentials",
    message: "The email or password you entered is incorrect. Please try again.",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    recoverable: true,
  },
  no_session: {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "Session Expired",
    message: "Your session has expired. Please log in again to continue.",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    recoverable: true,
  },
  server_error: {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "Server Error",
    message: "An unexpected error occurred. Please try again in a few moments.",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    recoverable: true,
  },
  network_error: {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "Connection Error",
    message: "Unable to connect to the server. Please check your internet connection.",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    recoverable: true,
  },
};

function getDashboardPath(role: string | null): string {
  switch (role) {
    case "student": return "/student";
    case "parent": return "/parent";
    case "teacher": return "/teacher";
    case "principal":
    case "super_admin": return "/admin";
    case "bursar": return "/bursar";
    case "librarian": return "/librarian";
    case "class_prefect": return "/student";
    default: return "/student";
  }
}

async function fetchProfile(token: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { profile: null, error: data.error || "Failed to load profile", code: data.code || "UNKNOWN" };
    }
    return { profile: data.profile, error: null, code: null };
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      return { profile: null, error: "Profile fetch timed out", code: "TIMEOUT" };
    }
    return { profile: null, error: e.message, code: "NETWORK_ERROR" };
  }
}

async function getSessionWithTimeout(ms: number = 5000) {
  return Promise.race([
    supabase.auth.getSession(),
    new Promise<{ data: { session: null } }>((_, reject) =>
      setTimeout(() => reject(new Error("Session check timed out")), ms)
    ),
  ]);
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = searchParams.get("portal");
  const errorParam = searchParams.get("error");
  const errorDetail = searchParams.get("error_detail");
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const errorConfig = errorParam ? (ERROR_CONFIGS[errorParam] || ERROR_CONFIGS.server_error) : null;

  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      try {
        const { data: { session } } = await getSessionWithTimeout(5000);
        if (cancelled) return;
        if (!session?.user) {
          setChecking(false);
          return;
        }
        const { profile, error, code } = await fetchProfile(session.access_token);
        if (cancelled) return;
        if (error) {
          if (code === "PROFILE_MISSING") {
            setChecking(false);
            return;
          }
          await supabase.auth.signOut().catch(() => {});
          setChecking(false);
          return;
        }
        if (!profile) {
          await supabase.auth.signOut().catch(() => {});
          setChecking(false);
          return;
        }
        if (profile.is_active === false) {
          await supabase.auth.signOut().catch(() => {});
          router.replace("/login?error=suspended");
          return;
        }
        if (!profile.password_changed) {
          router.replace("/reset-password?first=true");
          return;
        }
        if (!profile.onboarding_completed) {
          router.replace("/onboarding");
          return;
        }
        const dest = redirectParam || getDashboardPath(profile.role);
        router.replace(dest);
      } catch (error: any) {
        console.error("[login] Session check failed:", error);
        if (cancelled) return;
        await supabase.auth.signOut().catch(() => {});
        setChecking(false);
      }
    };
    checkSession();
    return () => { cancelled = true; };
  }, [router, redirectParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message?.toLowerCase().includes("invalid login")) {
          setLoginError("Invalid email or password. Please try again.");
        } else if (error.message?.toLowerCase().includes("too many requests")) {
          setLoginError("Too many attempts. Please wait a moment and try again.");
        } else {
          setLoginError(error.message || "Login failed. Please try again.");
        }
        setLoading(false);
        return;
      }
      if (!data.user || !data.session) {
        setLoginError("Login succeeded but no session was created. Please try again.");
        setLoading(false);
        return;
      }
      const { profile, error: profileError, code } = await fetchProfile(data.session.access_token);
      if (profileError) {
        if (code === "PROFILE_MISSING") {
          setRecovering(true);
          const recoveryRes = await fetch("/api/admin/recover", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ action: "restore_own_profile" }),
          });
          if (recoveryRes.ok) {
            toast.success("Profile restored! Please log in again.");
            await supabase.auth.signOut();
            setRecovering(false);
            setLoading(false);
            return;
          }
          setRecovering(false);
          setLoginError("Your account profile is missing. Please contact the administrator.");
          setLoading(false);
          return;
        }
        if (code === "ACCOUNT_LOCKED") {
          setLoginError("Your account is temporarily locked due to too many failed attempts.");
          setLoading(false);
          return;
        }
        setLoginError(profileError || "Could not load your profile. Please try again.");
        setLoading(false);
        return;
      }
      if (!profile) {
        setLoginError("Profile not found. Please contact the administrator.");
        setLoading(false);
        return;
      }
      if (profile.is_active === false) {
        await supabase.auth.signOut().catch(() => {});
        router.replace("/login?error=suspended");
        return;
      }
      if (!profile.password_changed) {
        router.push("/reset-password?first=true");
        return;
      }
      if (!profile.onboarding_completed) {
        router.push("/onboarding");
        return;
      }
      const dest = redirectParam || getDashboardPath(profile.role);
      router.push(dest);
    } catch (error: any) {
      console.error("[login] Error:", error);
      setLoginError(error.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverProfile = async () => {
    setRecovering(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Please log in first");
        setRecovering(false);
        return;
      }
      const res = await fetch("/api/admin/recover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "restore_own_profile" }),
      });
      if (res.ok) {
        toast.success("Profile restored! Refreshing...");
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Recovery failed. Please contact the administrator.");
      }
    } catch (err: any) {
      toast.error(err.message || "Recovery failed");
    } finally {
      setRecovering(false);
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
            <p className="text-xs text-[#c9a227] mt-2 font-medium">&quot;Prayer, Commitment and Hard Work for Success&quot;</p>
          </div>

          {errorConfig && (
            <div className={`mb-6 p-4 rounded-xl border ${errorConfig.bgColor}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${errorConfig.color}`}>{errorConfig.icon}</div>
                <div className="flex-1">
                  <h3 className={`text-sm font-semibold ${errorConfig.color}`}>{errorConfig.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{errorDetail || errorConfig.message}</p>
                  {errorConfig.showRecovery && (
                    <button
                      onClick={handleRecoverProfile}
                      disabled={recovering}
                      className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${recovering ? "animate-spin" : ""}`} />
                      {recovering ? "Recovering..." : "Restore My Profile"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {loginError && !errorConfig && (
            <div className="mb-6 p-4 rounded-xl border bg-red-50 border-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{loginError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <Input
                type="email"
                placeholder="you@bdja.ac.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1e3a5f] hover:bg-[#2d5a87] text-white font-medium rounded-xl transition-all"
            >
              {loading ? "Signing in..." : `Sign In to ${portalLabel}`}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Need help?{" "}
              <Link href="/contact" className="text-[#c9a227] hover:underline">
                Contact us
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">&copy; 2026 Bishop Davis Joy Academy. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
