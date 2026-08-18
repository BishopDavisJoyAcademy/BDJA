"use client";

import { FileText } from "lucide-react";

const newsItems = [
  { title: "Our Playgroup Graduation Ceremony", date: "May 18, 2024", category: "Events" },
  { title: "Grade 6 Learners Excel in National Assessment", date: "May 12, 2024", category: "Academics" },
  { title: "Fun Day Activities Bring Learning to Life", date: "May 05, 2024", category: "Events" },
  { title: "Parent-Teacher Meeting Term II", date: "April 28, 2024", category: "General" },
  { title: "New Library Resources Available", date: "April 20, 2024", category: "Resources" },
];

export default function NewsEventsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-6">News & Events</h1>
        <p className="text-gray-600 mb-8">Stay updated with the latest happenings at Bishop Davis Joy Academy.</p>
        <div className="space-y-4">
          {newsItems.map((item, idx) => (
            <div key={idx} className="flex items-start gap-4 p-5 border border-gray-200 rounded-xl hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#1e3a5f]">{item.title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">{item.date}</span>
                  <span className="text-xs px-2 py-0.5 bg-[#1e3a5f]/10 text-[#1e3a5f] rounded-full">{item.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
  );
}
