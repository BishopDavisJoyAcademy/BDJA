"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AlertCircle, Eye, EyeOff, CheckCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirst = searchParams.get("first") === "true";
  const type = searchParams.get("type") || "staff";
  const isStudent = type === "student";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newCredential, setNewCredential] = useState("");
  const [confirmCredential, setConfirmCredential] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (newCredential !== confirmCredential) {
      setError(isStudent ? "PINs do not match" : "Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // Use getUser() to validate session securely
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

      let res;
      if (isFirst) {
        res = await fetch("/api/auth/first-login", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(isStudent ? { new_pin: newCredential, confirm_pin: confirmCredential } : { new_password: newCredential, confirm_password: confirmCredential }),
        });
      } else {
        res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ current_password: currentPassword, new_password: newCredential }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update");
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Sign out after password change to force re-login with new credentials
      await supabase.auth.signOut();
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">{isStudent ? "PIN" : "Password"} Updated!</h2>
          <p className="text-gray-500 mt-2">Please log in with your new {isStudent ? "PIN" : "password"}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isFirst ? `Set Your ${isStudent ? "PIN" : "Password"}` : "Reset Password"}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {isFirst ? `Create a secure ${isStudent ? "PIN" : "password"} for your account.` : "Enter your current and new password."}
        </p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isFirst && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New {isStudent ? "PIN" : "Password"}
            </label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={newCredential} onChange={(e) => setNewCredential(e.target.value)}
                required minLength={isStudent ? 4 : 8} maxLength={isStudent ? 8 : 128}
                pattern={isStudent ? "^\d+$" : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isStudent && <p className="text-xs text-gray-500 mt-1">4-8 digits only</p>}
            {!isStudent && (
              <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                <p className={newCredential.length >= 8 ? "text-green-600" : ""}>✓ At least 8 characters</p>
                <p className={/[A-Z]/.test(newCredential) ? "text-green-600" : ""}>✓ One uppercase letter</p>
                <p className={/[a-z]/.test(newCredential) ? "text-green-600" : ""}>✓ One lowercase letter</p>
                <p className={/[0-9]/.test(newCredential) ? "text-green-600" : ""}>✓ One number</p>
                <p className={/[^A-Za-z0-9]/.test(newCredential) ? "text-green-600" : ""}>✓ One special character</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm {isStudent ? "PIN" : "Password"}
            </label>
            <input type={showPassword ? "text" : "password"} value={confirmCredential} onChange={(e) => setConfirmCredential(e.target.value)}
              required minLength={isStudent ? 4 : 8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
            {loading ? "Saving..." : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}
