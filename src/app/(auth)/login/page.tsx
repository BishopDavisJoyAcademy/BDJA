"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { School, Eye, EyeOff, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "";
  const errorParam = searchParams.get("error");
  const errorDetail = searchParams.get("error_detail");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(errorParam ? (errorDetail || "An error occurred") : "");

  const handleLogin = async (e: React.FormEvent) => {
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
        // Fetch full profile
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

        if (!profile?.password_changed) {
          router.push("/reset-password?first=true");
          return;
        }
        if (!profile?.onboarding_completed) {
          router.push("/onboarding");
          return;
        }

        if (redirect && redirect !== "/login" && redirect !== "/reset-password") {
          router.push(redirect);
          return;
        }

        const category = profile?.user_category || "student";
        if (category === "student") router.push("/student");
        else if (category === "parent") router.push("/parent");
        else if (category === "staff") router.push("/teacher");
        else if (category === "admin") router.push("/admin");
        else router.push("/student");
      }
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

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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

        <p className="mt-4 text-center text-sm text-gray-500">
          Forgot password? <Link href="/reset-password" className="text-bdja-primary hover:underline">Reset here</Link>
        </p>
      </div>
    </div>
  );
}
