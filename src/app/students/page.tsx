"use client";

import Link from "next/link";
import { BookOpen, Video, Library, HelpCircle, Download, GraduationCap } from "lucide-react";

const resources = [
  { label: "VORA Learning", href: "/vora", icon: Video, desc: "Access video lessons and online resources." },
  { label: "Library", href: "/library", icon: Library, desc: "Browse our digital and physical book collection." },
  { label: "Help Desk", href: "/help", icon: HelpCircle, desc: "Get support for academic and technical issues." },
  { label: "Downloads", href: "/downloads", icon: Download, desc: "Download assignments, notes, and study materials." },
  { label: "Student Portal", href: "/login?portal=student", icon: GraduationCap, desc: "Access your grades, timetable, and attendance." },
];

export default function StudentsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-4">Students</h1>
        <p className="text-gray-600 mb-10">Everything you need for your learning journey at Bishop Davis Joy Academy.</p>
        <div className="grid md:grid-cols-2 gap-4">
          {resources.map((r) => {
            const Icon = r.icon;
            return (
              <Link key={r.label} href={r.href} className="flex items-start gap-4 p-5 border border-gray-200 rounded-xl hover:shadow-lg hover:border-[#1e3a5f]/30 transition-all">
                <div className="w-12 h-12 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-[#1e3a5f]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1e3a5f]">{r.label}</h3>
                  <p className="text-sm text-gray-500">{r.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
  );
}
