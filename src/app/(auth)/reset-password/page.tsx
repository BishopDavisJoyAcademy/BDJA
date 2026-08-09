"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff, Shield, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstLogin = searchParams.get("first") === "true";

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user }, error: userError }) => {
      if (cancelled) return;
      if (userError || !user) {
        toast.error("Please log in first");
        router.replace("/login");
        return;
      }
      setChecking(false);
    });

    return () => { cancelled = true; };
  }, [router]);

  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    match: password === confirmPassword && password.length > 0,
  };
  const allValid = Object.values(checks).every(Boolean);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) {
      toast.error("Please meet all password requirements");
      return;
    }
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("Session expired. Please log in again.");
        router.push("/login");
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Session expired. Please log in again.");
        router.push("/login");
        return;
      }

      const body: any = {
        new_password: password,
        confirm_password: confirmPassword,
        is_first_login: isFirstLogin,
      };
      if (!isFirstLogin) body.current_password = currentPassword;

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      toast.success("Password updated successfully!");
      router.push(isFirstLogin ? "/onboarding" : "/");
    } catch (error: any) {
      console.error("[reset-password] Error:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bdja-primary via-bdja-accent to-bdja-dark">
        <div className="text-white text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bdja-primary via-bdja-accent to-bdja-dark p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-bdja-secondary rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-bdja-dark">
              {isFirstLogin ? "Set Your Password" : "Change Password"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isFirstLogin ? "Create a strong password to secure your account" : "Update your password for security"}
            </p>
          </div>
          <form onSubmit={handleReset} className="space-y-5">
            {!isFirstLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                <Input type="password" placeholder="Your current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Minimum 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <Input type="password" placeholder="Re-enter new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">{checks.length ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}<span className={checks.length ? "text-green-600" : "text-gray-500"}>At least 8 characters</span></div>
              <div className="flex items-center gap-2">{checks.upper ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}<span className={checks.upper ? "text-green-600" : "text-gray-500"}>One uppercase letter</span></div>
              <div className="flex items-center gap-2">{checks.lower ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}<span className={checks.lower ? "text-green-600" : "text-gray-500"}>One lowercase letter</span></div>
              <div className="flex items-center gap-2">{checks.number ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}<span className={checks.number ? "text-green-600" : "text-gray-500"}>One number</span></div>
              <div className="flex items-center gap-2">{checks.special ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}<span className={checks.special ? "text-green-600" : "text-gray-500"}>One special character</span></div>
              <div className="flex items-center gap-2">{checks.match ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}<span className={checks.match ? "text-green-600" : "text-gray-500"}>Passwords match</span></div>
            </div>
            <Button type="submit" disabled={loading || !allValid} className="w-full py-3 bg-bdja-secondary hover:bg-bdja-accent text-white font-medium rounded-xl transition-all">
              {loading ? "Updating..." : isFirstLogin ? "Set Password" : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
