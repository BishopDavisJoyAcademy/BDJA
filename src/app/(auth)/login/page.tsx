"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff, School } from "lucide-react";
import toast from "react-hot-toast";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  password_changed: boolean;
  onboarding_completed: boolean;
  is_active: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
        const profile = profileData as Profile | null;
        if (!profile?.password_changed) { router.push("/reset-password?first=true"); return; }
        if (!profile?.onboarding_completed) { router.push("/onboarding"); return; }
        router.push("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bdja-primary via-bdja-accent to-bdja-dark p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-bdja-primary rounded-xl flex items-center justify-center">
              <School className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-bdja-dark">BDJA Platform</h1>
            <p className="text-sm text-gray-500 mt-1">Bishop Davis Joy Academy</p>
            <p className="text-xs text-bdja-secondary mt-2 font-medium">"Prayer, Commitment and Hard Work for Success"</p>
            {errorParam === "suspended" && (
              <p className="mt-3 text-sm text-bdja-danger bg-red-50 p-2 rounded-lg">Your account has been suspended. Contact the administrator.</p>
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
            <Button type="submit" variant="primary" size="lg" isLoading={loading} className="w-full">Sign In</Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">Need help? Ask <span className="text-bdja-secondary font-medium">Joy</span> anytime</p>
          </div>
        </div>
        <div className="text-center mt-6">
          <p className="text-xs text-white/60">&copy; {new Date().getFullYear()} Bishop Davis Joy Academy. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
