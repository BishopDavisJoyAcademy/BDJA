"use client";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { Download, FileText } from "lucide-react";

const downloads = [
  { name: "Admission Form 2024", size: "245 KB" },
  { name: "School Calendar 2024", size: "180 KB" },
  { name: "Fee Structure", size: "120 KB" },
  { name: "School Policy Handbook", size: "1.2 MB" },
  { name: "CBC Curriculum Guide", size: "890 KB" },
];

export default function DownloadsPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-6">Downloads</h1>
        <p className="text-gray-600 mb-8">Access important school documents and resources.</p>
        <div className="space-y-3">
          {downloads.map((d, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#1e3a5f]" />
                <div>
                  <p className="font-medium text-sm text-[#1e3a5f]">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.size}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Download className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
