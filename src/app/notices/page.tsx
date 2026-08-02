"use client";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { FileText } from "lucide-react";

const notices = [
  { title: "School Term II Resumes", date: "May 20, 2024" },
  { title: "Parent-Teacher Meeting", date: "May 15, 2024" },
  { title: "Mid Term Break", date: "May 10, 2024" },
  { title: "Sports Day Announcement", date: "May 05, 2024" },
  { title: "Fee Payment Reminder", date: "April 28, 2024" },
];

export default function NoticesPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-6">Notice Board</h1>
        <p className="text-gray-600 mb-8">Important announcements and notices for the BDJA community.</p>
        <div className="space-y-3">
          {notices.map((n, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-[#1e3a5f]" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#1e3a5f]">{n.title}</h3>
                <p className="text-xs text-gray-400">{n.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
