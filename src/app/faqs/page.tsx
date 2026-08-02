"use client";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  { q: "What curriculum does BDJA follow?", a: "We follow the Competency Based Curriculum (CBC) as prescribed by the Kenya Institute of Curriculum Development (KICD)." },
  { q: "What grades do you offer?", a: "We offer Playgroup, Pre-Primary 1 (PP1), Pre-Primary 2 (PP2), and Grade 1 through Grade 6." },
  { q: "How do I apply for admission?", a: "You can apply by visiting our admissions office, calling us at 0708 449 158, or emailing bishopdavisjoyacademy@gmail.com." },
  { q: "What are the school hours?", a: "School runs from 8:00 AM to 3:30 PM, Monday through Friday." },
  { q: "Do you provide transport?", a: "Yes, we have a school transport service covering Nanyuki and surrounding areas. Contact us for route details." },
  { q: "What is the fee structure?", a: "Fee structures vary by grade level. Please contact our bursar&rsquo;s office for detailed fee information." },
];

export default function FAQsPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-6">Frequently Asked Questions</h1>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(open === idx ? null : idx)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-[#1e3a5f]">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open === idx ? "rotate-180" : ""}`} />
              </button>
              {open === idx && (
                <div className="px-4 pb-4 text-sm text-gray-600">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
