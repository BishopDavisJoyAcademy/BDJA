"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import {
  Users, GraduationCap, Wallet, UserCheck, Loader2, Award,
  BookOpen, CalendarDays, Megaphone, ArrowRight
} from "lucide-react";
import Link from "next/link";

const GOLD = "#D4AF37";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const cardAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

interface Child {
  id: string;
  full_name: string;
  grade_level: string;
  admission_number: string;
  class_name: string | null;
}

export default function StudentParentPortal() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchChildren = useCallback(async () => {
    setFetching(true);
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
      const res = await fetch("/api/parent/children", { headers });
      if (!res.ok) throw new Error("Failed to fetch children");
      const data = await res.json();
      setChildren(data.children || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchChildren(); }, [fetchChildren]);

  const quickLinks = [
    { label: "Grades", href: "/student/grades", icon: Award, desc: "View assessments" },
    { label: "Attendance", href: "/student/attendance", icon: UserCheck, desc: "Track attendance" },
    { label: "Assignments", href: "/student/assignments", icon: BookOpen, desc: "Due & submitted" },
    { label: "Fees", href: "/student/fees", icon: Wallet, desc: "Payment & balance" },
    { label: "Calendar", href: "/student/calendar", icon: CalendarDays, desc: "School events" },
    { label: "Announcements", href: "/student/announcements", icon: Megaphone, desc: "School updates" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Parent Portal</h1>
        <p className="text-slate-400 mt-1">View your children&apos;s progress and school information</p>
      </motion.div>

      {fetching ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : (
        <>
          {/* Stats */}
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={cardAnim} className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#3b82f615", border: "1px solid #3b82f630" }}>
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Children</p>
                  <p className="text-xl font-bold text-white">{children.length}</p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={cardAnim} className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#22c55e15", border: "1px solid #22c55e30" }}>
                  <GraduationCap className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Active</p>
                  <p className="text-xl font-bold text-white">{children.filter((c) => c.class_name).length}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Children List */}
          {children.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Your Children</h3>
              {children.map((child) => (
                <motion.div key={child.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{child.full_name}</p>
                      <p className="text-xs text-slate-500">{child.admission_number} · {child.class_name || "No class assigned"}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Quick Links */}
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <motion.div key={link.label} variants={cardAnim}>
                  <Link href={link.href} className="group flex items-center gap-4 rounded-2xl bg-slate-900/40 border border-slate-700/30 hover:border-[#D4AF37]/20 p-4 transition-all duration-300">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#D4AF3710", border: "1px solid #D4AF3720" }}>
                      <Icon className="w-5 h-5" style={{ color: GOLD }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors">{link.label}</p>
                      <p className="text-xs text-slate-500">{link.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-[#D4AF37] transition-colors shrink-0" />
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}
    </div>
  );
}
