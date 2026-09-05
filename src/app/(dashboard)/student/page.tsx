"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { motion } from "framer-motion";
import { ClipboardList, Calendar, BookOpen, Library, Baby, ArrowRight } from "lucide-react";

const GOLD = "#D4AF37";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Student Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome back, {user?.full_name}</p>
      </motion.div>

      {/* Parent Portal Access Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Link href="/student/parent" className="group block relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-700/50 hover:border-[#D4AF37]/30 transition-all duration-300">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "linear-gradient(135deg, #D4AF3708 0%, transparent 60%)" }} />
          <div className="relative p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#D4AF3715", border: "1px solid #D4AF3730" }}>
              <Baby className="w-6 h-6" style={{ color: GOLD }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white group-hover:text-[#D4AF37] transition-colors">Parent Portal</h3>
              <p className="text-xs text-slate-400 mt-0.5">View your child&apos;s grades, attendance, fees, and communicate with teachers</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all shrink-0" />
          </div>
        </Link>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "My Grades", icon: ClipboardList, href: "/student/grades", desc: "View assessments" },
          { label: "Timetable", icon: Calendar, href: "/student/timetable", desc: "Daily schedule" },
          { label: "Assignments", icon: BookOpen, href: "/student/assignments", desc: "Due & submitted" },
          { label: "Library", icon: Library, href: "/library", desc: "Browse resources" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} variants={item}>
              <Link href={card.href} className="group block h-full rounded-2xl bg-slate-900/60 border border-slate-700/50 hover:border-[#D4AF37]/20 p-5 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "#D4AF3715", border: "1px solid #D4AF3720" }}>
                  <Icon className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <p className="font-semibold text-white text-sm group-hover:text-[#D4AF37] transition-colors">{card.label}</p>
                <p className="text-xs text-slate-500 mt-1">{card.desc}</p>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
