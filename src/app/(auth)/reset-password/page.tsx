"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstLogin = searchParams.get("first") === "true";
  const userType = searchParams.get("type") || "staff"; // "staff" or "student"
  const isStudent = userType === "student";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

  const validatePassword = (pwd: string) => {
    if (isStudent) {
      if (pwd.length < 4) return "PIN must be at least 4 digits";
      if (!/^\d+$/.test(pwd)) return "PIN must contain only numbers";
      return "";
    }
    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pwd)) return "Must contain an uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Must contain a lowercase letter";
    if (!/[0-9]/.test(pwd)) return "Must contain a number";
    if (!/[^A-Za-z0-9]/.test(pwd)) return "Must contain a special character";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setError(isStudent ? "PINs do not match" : "Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }

      // First login uses /api/auth/first-login (no current_password needed)
      // Normal change uses /api/auth/change-password (requires current_password)
      const endpoint = isFirstLogin ? "/api/auth/first-login" : "/api/auth/change-password";
      const body: any = isFirstLogin
        ? (isStudent
            ? { new_pin: password, confirm_pin: confirmPassword }
            : { new_password: password, confirm_password: confirmPassword })
        : { current_password: currentPassword, new_password: password, confirm_password: confirmPassword };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setSuccess(true);
      toast.success(data.message || "Updated successfully!");

      // After first login, session is kept alive — go to onboarding
      setTimeout(() => {
        router.push("/onboarding");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bdja-primary to-bdja-dark">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bdja-primary to-bdja-dark px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">
            {isStudent ? "PIN Set Successfully!" : "Password Set Successfully!"}
          </h2>
          <p className="text-gray-500">Redirecting you to onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bdja-primary to-bdja-dark px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-6">
          <Link href="/login" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-6 h-6 text-bdja-primary" />
            <h1 className="text-xl font-bold text-gray-900">
              {isFirstLogin
                ? (isStudent ? "Set Your PIN" : "Set Your Password")
                : (isStudent ? "Reset PIN" : "Reset Password")}
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            {isFirstLogin
              ? (isStudent
                  ? "Create a secure PIN for your student account."
                  : "Create a secure password for your staff account.")
              : "Enter your current password and choose a new one."}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isFirstLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required={!isFirstLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isStudent ? "New PIN" : "New Password"}
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isStudent ? "Enter 4+ digit PIN" : "Min 8 chars, upper, lower, number, special"}
                required
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isStudent ? "Confirm PIN" : "Confirm Password"}
            </label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={isStudent ? "Re-enter PIN" : "Re-enter password"}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? (isStudent ? "Setting PIN..." : "Setting Password...")
              : (isStudent ? "Set PIN" : "Set Password")}
          </Button>
        </form>
      </div>
    </div>
  );
}
