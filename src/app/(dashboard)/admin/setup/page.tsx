"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { apiGet } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Shield, Database, Wrench, Settings, CheckCircle, Circle, Loader2,
  ArrowRight, AlertTriangle, Users, BookOpen, Building2, Sparkles,
  GraduationCap, FileText
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { ADMIN_SEGMENT } from "@/lib/constants";

interface SetupStatus {
  hasSuperAdmin: boolean;
  campusCount: number;
  subjectCount: number;
  staffCount: number;
  studentCount: number;
  cmsPageCount: number;
  voraCount: number;
  hasSettings: boolean;
}

interface SetupTask {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  icon: React.ElementType;
  href: string;
  count?: number;
  target?: number;
}

export default function SetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await apiGet<SetupStatus>("/api/admin/setup");
      setStatus(data);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.user_category === "admin") fetchStatus();
  }, [user, fetchStatus]);

  const tasks: SetupTask[] = status ? [
    {
      id: "super-admin",
      label: "Super Admin Configured",
      description: "Primary administrator account is set up",
      completed: status.hasSuperAdmin,
      icon: Shield,
      href: `/${ADMIN_SEGMENT}/staff`,
    },
    {
      id: "campuses",
      label: "Campuses Added",
      description: "Add at least one school campus",
      completed: status.campusCount > 0,
      icon: Building2,
      href: `/${ADMIN_SEGMENT}/campuses`,
      count: status.campusCount,
      target: 1,
    },
    {
      id: "subjects",
      label: "Subjects Defined",
      description: "Define academic subjects and curricula",
      completed: status.subjectCount > 0,
      icon: BookOpen,
      href: `/${ADMIN_SEGMENT}/subjects`,
      count: status.subjectCount,
      target: 1,
    },
    {
      id: "staff",
      label: "Staff Added",
      description: "Add teachers and administrative staff",
      completed: status.staffCount > 0,
      icon: Users,
      href: `/${ADMIN_SEGMENT}/staff`,
      count: status.staffCount,
      target: 1,
    },
    {
      id: "students",
      label: "Students Enrolled",
      description: "Enroll students into the system",
      completed: status.studentCount > 0,
      icon: GraduationCap,
      href: `/${ADMIN_SEGMENT}/students`,
      count: status.studentCount,
      target: 1,
    },
    {
      id: "cms",
      label: "CMS Pages Created",
      description: "Set up public-facing content pages",
      completed: status.cmsPageCount > 0,
      icon: FileText,
      href: `/${ADMIN_SEGMENT}/pages`,
      count: status.cmsPageCount,
      target: 1,
    },
    {
      id: "vora",
      label: "VORA Content",
      description: "Set up AI-powered learning content",
      completed: status.voraCount > 0,
      icon: Sparkles,
      href: `/${ADMIN_SEGMENT}/vora`,
      count: status.voraCount,
      target: 1,
    },
    {
      id: "settings",
      label: "Platform Settings",
      description: "Configure platform-wide settings",
      completed: status.hasSettings,
      icon: Settings,
      href: "/settings",
    },
  ] : [];

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-slate-100">Platform Setup</h1>
        <p className="text-slate-400">Complete these steps to fully configure BDJA</p>
      </motion.div>

      {/* Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-500">Setup Progress</p>
              <p className="text-3xl font-bold text-slate-100">
                {completedCount} <span className="text-slate-500 text-lg">/ {tasks.length}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#D4AF37]">{Math.round(progress)}%</p>
              <p className="text-xs text-slate-500">Complete</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #D4AF37, #E8C84A)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          {progress === 100 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <p className="text-emerald-400 font-medium">All setup tasks completed! Your platform is ready.</p>
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      {/* Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : (
          tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={task.href}>
                <Card
                  className={`p-4 flex items-center gap-4 cursor-pointer transition-all hover:border-[#D4AF37]/30 ${
                    task.completed ? "border-emerald-500/20" : ""
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    task.completed
                      ? "bg-emerald-500/10"
                      : "bg-slate-800"
                  }`}>
                    {task.completed ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <task.icon className="w-5 h-5 text-slate-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${task.completed ? "text-emerald-400" : "text-slate-200"}`}>
                        {task.label}
                      </h3>
                      {task.completed && (
                        <Badge variant="success" className="text-[10px]">Done</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{task.description}</p>
                    {task.count !== undefined && task.target !== undefined && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        {task.count} of {task.target} minimum required
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {task.count !== undefined && (
                      <span className="text-sm font-medium text-slate-400">
                        {task.count}
                      </span>
                    )}
                    <ArrowRight className={`w-5 h-5 ${task.completed ? "text-emerald-400" : "text-slate-600"}`} />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
