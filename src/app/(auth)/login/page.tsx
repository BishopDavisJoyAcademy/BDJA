"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { School, Eye, EyeOff, AlertCircle, GraduationCap, Shield } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "";
  const errorParam = searchParams.get("error");
  const errorDetail = searchParams.get("error_detail");

  const [tab, setTab] = useState<"staff" | "student">("staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [pin, setPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(errorParam ? (errorDetail || "An error occurred") : "");

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.user && data.session) {
        // Fetch profile to check status
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_category, password_changed, onboarding_completed, is_active")
          .eq("id", data.user.id)
          .single();

        if (profile?.is_active === false) {
          await supabase.auth.signOut();
          setError("Your account has been suspended.");
          setLoading(false);
          return;
        }

        // First login — redirect to set password
        if (profile?.password_changed === false) {
          router.push(`/reset-password?first=true&type=staff`);
          return;
        }

        // Onboarding
        if (profile?.onboarding_completed === false) {
          router.push("/onboarding");
          return;
        }

        // Redirect after login
        if (redirect && redirect !== "/login" && redirect !== "/reset-password") {
          router.push(redirect);
          return;
        }

        const category = profile?.user_category || "student";
        if (category === "student") router.push("/student");
        else if (category === "parent") router.push("/parent");
        else if (category === "staff") router.push("/teacher");
        else if (category === "admin") {
          const adminSegment = process.env.NEXT_PUBLIC_ADMIN_SEGMENT || "admin";
          router.push(`/${adminSegment}`);
        }
        else router.push("/student");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admission_number: admissionNumber, pin }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid admission number or PIN");
        setLoading(false);
        return;
      }

      // Set session in client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        setError("Failed to establish session");
        setLoading(false);
        return;
      }

      // Check profile status
      const { data: profile } = await supabase
        .from("profiles")
        .select("password_changed, onboarding_completed, is_active")
        .eq("id", data.user.id)
        .single();

      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        setError("Your account has been suspended.");
        setLoading(false);
        return;
      }

      // First login — redirect to set PIN
      if (profile?.password_changed === false) {
        router.push("/reset-password?first=true&type=student");
        return;
      }

      // Onboarding
      if (profile?.onboarding_completed === false) {
        router.push("/onboarding");
        return;
      }

      router.push("/student");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bdja-primary to-bdja-dark px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <School className="w-12 h-12 text-bdja-primary mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">BDJA Platform</h1>
          <p className="text-sm text-gray-500">Bishop Davis Joy Academy</p>
        </div>

        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => setTab("staff")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "staff"
                ? "bg-white text-bdja-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Shield className="w-4 h-4" /> Staff
          </button>
          <button
            type="button"
            onClick={() => setTab("student")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "student"
                ? "bg-white text-bdja-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Student
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {tab === "staff" ? (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@bdja.ac.ke" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleStudentLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number</label>
              <Input value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} placeholder="BDJA/2026/001" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter your PIN" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          Forgot password? <Link href="/reset-password" className="text-bdja-primary hover:underline">Reset here</Link>
        </p>
      </div>
    </div>
  );
}
