"use client";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { Video, BookOpen, Play } from "lucide-react";

const videos = [
  { title: "Introduction to CBC", duration: "12:30", subject: "General" },
  { title: "Mathematics: Addition Basics", duration: "15:45", subject: "Mathematics" },
  { title: "English: Reading Comprehension", duration: "18:20", subject: "English" },
  { title: "Science: Parts of a Plant", duration: "10:15", subject: "Science" },
  { title: "Kiswahili: Sarufi", duration: "14:00", subject: "Kiswahili" },
];

export default function VoraPage() {
  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-4">VORA Learning</h1>
        <p className="text-gray-600 mb-10">Video-based Online Resource for Academic learning. Access video lessons anytime, anywhere.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all group">
              <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                <Video className="w-10 h-10 text-gray-300" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-[#1e3a5f] ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-sm text-[#1e3a5f] line-clamp-2">{v.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs px-2 py-0.5 bg-[#1e3a5f]/10 text-[#1e3a5f] rounded-full">{v.subject}</span>
                  <span className="text-xs text-gray-400">{v.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
