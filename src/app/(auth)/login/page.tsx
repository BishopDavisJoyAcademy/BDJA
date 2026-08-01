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
  const portal = searchParams.get("portal");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

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
        // Redirect to role-specific dashboard
        const role = profile?.role;
        if (role === "student") router.push("/student");
        else if (role === "parent") router.push("/parent");
        else if (role === "teacher") router.push("/teacher");
        else if (role === "principal" || role === "super_admin") router.push("/admin");
        else if (role === "bursar") router.push("/bursar");
        else if (role === "librarian") router.push("/librarian");
        else router.push("/student");
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials");
    } finally { setLoading(false); }
  };

  const portalLabel = portal === "student" ? "Student Portal" : portal === "staff" ? "Staff Portal" : "BDJA Platform";

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/logo.png"
          alt="BDJA Background"
          fill
          className="object-contain opacity-10 scale-150"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-bdja-primary/90 via-bdja-accent/90 to-bdja-dark/95" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 animate-fade-in border border-white/20">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-bdja-primary mb-4 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Back to Home
            </Link>
            <div className="w-20 h-20 mx-auto mb-4 bg-bdja-primary rounded-xl flex items-center justify-center shadow-lg">
              <School className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-bdja-dark">{portalLabel}</h1>
            <p className="text-sm text-gray-500 mt-1">Bishop Davis Joy Academy</p>
            <p className="text-xs text-bdja-secondary mt-2 font-medium">&ldquo;Prayer, Commitment and Hard Work for Success&rdquo;</p>
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
            <Button type="submit" disabled={loading} className="w-full py-3 bg-bdja-primary hover:bg-bdja-accent text-white font-medium rounded-xl transition-all">
              {loading ? "Signing in..." : `Sign In to ${portalLabel}`}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">Need help? Ask <Link href="/" className="text-bdja-secondary hover:underline">Joy</Link> anytime</p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">&copy; 2026 Bishop Davis Joy Academy. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
