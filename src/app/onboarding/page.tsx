"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/hooks/useStore";
import { BookOpen, Calendar, MessageCircle, GraduationCap, Award, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const steps = [
  {
    title: "Welcome to BDJA!",
    description: "Your journey with Bishop Davis Joy Academy starts here. Let us show you around.",
    icon: Sparkles,
    content: "BDJA Platform is your all-in-one hub for learning, communication, and growth. Everything you need is right here.",
  },
  {
    title: "Your Dashboard",
    description: "Your personal command center",
    icon: BookOpen,
    content: "From your dashboard, you can view your timetable, check assignments, see your grades, and access VORA learning content. Everything is organized just for you.",
  },
  {
    title: "Stay Organized",
    description: "Calendar & Timetable",
    icon: Calendar,
    content: "Your class timetable and school events are always up to date. Check the calendar for exams, sports days, meetings, and devotion themes.",
  },
  {
    title: "Connect",
    description: "Messages & Collaboration",
    icon: MessageCircle,
    content: "Send messages to teachers, chat with classmates, and stay connected with your school community — all within the platform.",
  },
  {
    title: "Track Progress",
    description: "Grades & Character",
    icon: GraduationCap,
    content: "View your CBC assessment results, character reports, and values badges. See how you're growing academically and personally.",
  },
  {
    title: "Meet Joy",
    description: "Your AI Assistant",
    icon: Award,
    content: "Joy is always here to help! Ask questions about your homework, get study tips, or just chat. Joy knows your classes and can guide you anytime.",
  },
];

function getDashboardPath(role: string | null): string {
  if (role === "student") return "/student";
  if (role === "parent") return "/parent";
  if (role === "teacher") return "/teacher";
  if (role === "principal" || role === "super_admin") return "/admin";
  if (role === "bursar") return "/bursar";
  if (role === "librarian") return "/librarian";
  return "/student";
}

function setAuthCookie(token: string) {
  try {
    const maxAge = 60 * 60 * 24 * 7;
    document.cookie = `bdja_auth_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch (e) {
    console.error("[onboarding] Failed to set auth cookie:", e);
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setIsOnboarding } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const step = steps[currentStep];
  const Icon = step.icon;

  const finishOnboarding = async () => {
    setCompleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Session lost. Please log in again.");
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role as string | null;
      const dashboard = getDashboardPath(role);

      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);

      // Refresh session and write custom cookie so middleware can auth on next request
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData.session?.access_token) {
        setAuthCookie(refreshData.session.access_token);
      }

      setIsOnboarding(false);
      toast.success("Welcome to BDJA! Let's get started.");
      router.push(dashboard);
    } catch {
      toast.error("Something went wrong, but you're all set!");
      router.push("/");
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await finishOnboarding();
    }
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bdja-primary via-bdja-accent to-bdja-dark p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-bdja-secondary rounded-xl flex items-center justify-center animate-pulse-soft">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-bdja-dark">{step.title}</h2>
            <p className="text-sm text-bdja-secondary font-medium mt-1">{step.description}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <p className="text-gray-700 leading-relaxed text-center">{step.content}</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep ? "w-8 bg-bdja-secondary" : "w-2 bg-gray-200"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip Tour
            </button>
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(currentStep - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleNext} isLoading={completing}>
                {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                {currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
