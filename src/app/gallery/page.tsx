"use client";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { Image as ImageIcon } from "lucide-react";

export default function GalleryPage() {
  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-6">Photo Gallery</h1>
        <p className="text-gray-600 mb-10">Moments captured at Bishop Davis Joy Academy.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center hover:shadow-lg transition-all">
              <ImageIcon className="w-10 h-10 text-gray-300" />
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
