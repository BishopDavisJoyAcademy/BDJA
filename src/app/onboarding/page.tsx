"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/hooks/useStore";
import { BookOpen, Calendar, MessageCircle, GraduationCap, Award, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const steps = [
  { title: "Welcome to BDJA!", description: "Your journey starts here.", icon: Sparkles, content: "BDJA Platform is your all-in-one hub for learning, communication, and growth." },
  { title: "Your Dashboard", description: "Your personal command center", icon: BookOpen, content: "View your timetable, check assignments, see your grades, and access VORA learning content." },
  { title: "Stay Organized", description: "Calendar & Timetable", icon: Calendar, content: "Your class timetable and school events are always up to date." },
  { title: "Connect", description: "Messages & Collaboration", icon: MessageCircle, content: "Send messages to teachers, chat with classmates, and stay connected." },
  { title: "Track Progress", description: "Grades & Character", icon: GraduationCap, content: "View your CBC assessment results, character reports, and values badges." },
  { title: "Meet Joy", description: "Your AI Assistant", icon: Award, content: "Joy is always here to help! Ask questions about homework, get study tips, or just chat." },
];

function getDashboardPath(role: string | null): string {
  switch (role) {
    case "student": return "/student";
    case "parent": return "/parent";
    case "teacher": return "/teacher";
    case "principal":
    case "super_admin": return "/admin";
    case "bursar": return "/bursar";
    case "librarian": return "/librarian";
    default: return "/student";
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setIsOnboarding } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session?.user) {
        toast.error("Please log in first");
        router.replace("/login");
        return;
      }
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, [router]);

  const step = steps[currentStep];
  const Icon = step.icon;

  const finishOnboarding = async () => {
    setCompleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Session lost. Please log in again.");
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile) {
        toast.error("Could not load profile. Please try again.");
        setCompleting(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", session.user.id);

      if (updateError) {
        toast.error("Failed to complete onboarding. Please try again.");
        setCompleting(false);
        return;
      }

      setIsOnboarding(false);
      toast.success("Welcome to BDJA!");
      router.push(getDashboardPath(profile.role));
    } catch (error: any) {
      toast.error("Something went wrong. Please try again.");
      setCompleting(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else await finishOnboarding();
  };

  const handleSkip = async () => { await finishOnboarding(); };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bdja-primary via-bdja-accent to-bdja-dark">
        <div className="text-white text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

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
              <div key={idx} className={`h-2 rounded-full transition-all duration-300 ${idx === currentStep ? "w-8 bg-bdja-secondary" : "w-2 bg-gray-200"}`} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button onClick={handleSkip} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Skip Tour</button>
            <div className="flex gap-3">
              {currentStep > 0 && <Button variant="outline" size="sm" onClick={() => setCurrentStep(currentStep - 1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>}
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
