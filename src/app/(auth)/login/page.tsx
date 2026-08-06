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

function getDashboardPath(userCategory: string | null, role: string | null): string {
  if (userCategory === "student") return "/student";
  if (userCategory === "parent") return "/parent";
  if (userCategory === "staff") return "/teacher";
  if (userCategory === "admin") return "/admin";
  // Legacy fallback
  if (role === "student") return "/student";
  if (role === "parent") return "/parent";
  if (role === "teacher") return "/teacher";
  if (role === "principal" || role === "super_admin") return "/admin";
  return "/student";
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
        const { data: { session } } = await getSessionWithTimeout(5000) as any;
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
        const dest = redirectParam || getDashboardPath(profile.user_category, profile.role);
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
      const dest = redirectParam || getDashboardPath(profile.user_category, profile.role);
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
        toast.success("Profile restored! Logging you in...");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error("Recovery failed. Please contact the administrator.");
      }
    } catch (err) {
      toast.error("Recovery failed. Please try again.");
    } finally {
      setRecovering(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-bdja-primary px-8 py-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <School className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">BDJA Portal</h1>
            <p className="text-white/80 text-sm mt-1">Bishop Davis Joy Academy</p>
          </div>

          <div className="p-8 space-y-6">
            {errorConfig && (
              <div className={`rounded-xl p-4 border ${errorConfig.bgColor}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${errorConfig.color}`}>{errorConfig.icon}</div>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-sm ${errorConfig.color}`}>{errorConfig.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{errorDetail || errorConfig.message}</p>
                    {errorConfig.showRecovery && (
                      <button
                        onClick={handleRecoverProfile}
                        disabled={recovering}
                        className="mt-3 flex items-center gap-2 text-sm font-medium text-bdja-primary hover:underline"
                      >
                        {recovering ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        {recovering ? "Restoring..." : "Restore my profile"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700">{loginError}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@bdja.ac.ke"
                  required
                  className="h-11"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="h-11 pr-10"
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
              <Button type="submit" disabled={loading} className="w-full h-11 text-base">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="text-center">
              <Link href="/reset-password" className="text-sm text-bdja-primary hover:underline">
                Forgot your password?
              </Link>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Protected by BDJA Security. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
