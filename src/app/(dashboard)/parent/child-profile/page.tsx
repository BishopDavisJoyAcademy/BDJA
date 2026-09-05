"use client";

import { useParentContext } from "@/contexts/ParentContext";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { Baby, Loader2, Award, UserCheck, BookOpen, Wallet, Clock, CalendarDays } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const GOLD = "#D4AF37";

interface ChildProfileData {
  id: string; admission_number: string; grade_level: string; date_of_birth: string | null; status: string;
  full_name: string; email: string | null; phone: string | null; avatar_url: string | null;
  class_name: string; class_teacher_name: string | null; campus_name: string | null;
  relationship: string | null;
}

export default function ParentChildProfile() {
  const { selectedChild } = useParentContext();
  const [profile, setProfile] = useState<ChildProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!selectedChild) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
      const res = await fetch(`/api/parent/child-profile?child_id=${selectedChild.student_id}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setProfile(data.child || null);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setLoading(false); }
  }, [selectedChild]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const quickLinks = [
    { label: "Grades", href: "/parent/grades", icon: Award, desc: "View assessments" },
    { label: "Attendance", href: "/parent/attendance", icon: UserCheck, desc: "Track attendance" },
    { label: "Assignments", href: "/parent/assignments", icon: BookOpen, desc: "Due & submitted" },
    { label: "Fees", href: "/parent/fees", icon: Wallet, desc: "Payment & balance" },
    { label: "Timetable", href: "/parent/timetable", icon: Clock, desc: "Class schedule" },
    { label: "Calendar", href: "/parent/calendar", icon: CalendarDays, desc: "School events" },
  ];

  if (!selectedChild) return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <Baby className="w-16 h-16 text-slate-700 mb-4" />
      <h2 className="text-xl font-semibold text-white mb-2">Select a Child</h2>
      <p className="text-slate-400 text-sm">Choose a child to view their profile.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Child Profile</h1>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} /></div>
      ) : profile ? (
        <>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-6">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center shrink-0 overflow-hidden">
                {profile.avatar_url ? <Image src={profile.avatar_url} alt="" width={80} height={80} className="w-full h-full object-cover" /> : <Baby className="w-8 h-8" style={{ color: GOLD }} />}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white">{profile.full_name}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  <p className="text-sm text-slate-400"><span className="text-slate-500">Admission:</span> {profile.admission_number}</p>
                  <p className="text-sm text-slate-400"><span className="text-slate-500">Class:</span> {profile.class_name}</p>
                  <p className="text-sm text-slate-400"><span className="text-slate-500">Grade:</span> {profile.grade_level}</p>
                  {profile.class_teacher_name && <p className="text-sm text-slate-400"><span className="text-slate-500">Teacher:</span> {profile.class_teacher_name}</p>}
                  {profile.campus_name && <p className="text-sm text-slate-400"><span className="text-slate-500">Campus:</span> {profile.campus_name}</p>}
                  {profile.date_of_birth && <p className="text-sm text-slate-400"><span className="text-slate-500">DOB:</span> {new Date(profile.date_of_birth).toLocaleDateString()}</p>}
                  {profile.relationship && <p className="text-sm text-slate-400"><span className="text-slate-500">Relationship:</span> <span className="capitalize">{profile.relationship}</span></p>}
                  <p className="text-sm text-slate-400"><span className="text-slate-500">Status:</span> <span className="capitalize">{profile.status}</span></p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.label} href={link.href} className="group flex items-center gap-4 rounded-2xl bg-slate-900/40 border border-slate-700/30 hover:border-[#D4AF37]/20 p-4 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#D4AF3710", border: "1px solid #D4AF3720" }}>
                    <Icon className="w-5 h-5" style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors">{link.label}</p>
                    <p className="text-xs text-slate-500">{link.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-8 text-center">
          <Baby className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-white mb-1">Profile Not Found</h3>
          <p className="text-xs text-slate-500">Could not load this child&apos;s profile.</p>
        </div>
      )}
    </div>
  );
}
