"use client";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { BookOpen, Search } from "lucide-react";

const books = [
  { title: "Mathematics Grade 1", author: "KICD", subject: "Mathematics" },
  { title: "English Grade 2", author: "KICD", subject: "Languages" },
  { title: "Science Grade 3", author: "KICD", subject: "Science" },
  { title: "Social Studies Grade 4", author: "KICD", subject: "Social Studies" },
  { title: "Kiswahili Grade 5", author: "KICD", subject: "Languages" },
  { title: "CRE Grade 6", author: "KICD", subject: "Religious Education" },
];

export default function LibraryPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-6">School Library</h1>
        <p className="text-gray-600 mb-8">Browse our collection of educational resources and books.</p>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search books..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {books.map((book, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-[#1e3a5f]" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-[#1e3a5f]">{book.title}</h3>
                <p className="text-xs text-gray-500">{book.author}</p>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{book.subject}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
