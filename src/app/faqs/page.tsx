"use client";

import { useState } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { CmsPageContent } from "@/components/CmsPageContent";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ChevronDown, HelpCircle } from "lucide-react";

const fallbackFaqs = [
  { q: "What grades do you offer?", a: "We offer Playgroup, PP1, PP2, and Grade 1 through Grade 6." },
  { q: "What curriculum do you follow?", a: "We follow the Competency Based Curriculum (CBC) as prescribed by the Kenya Institute of Curriculum Development (KICD)." },
  { q: "How do I apply for admission?", a: "Contact us at 0708 449 158 or visit our admissions office. You can also email us at bishopdavisjoyacademy@gmail.com." },
  { q: "What are the school hours?", a: "School runs from 8:00 AM to 3:30 PM, Monday through Friday." },
  { q: "Do you provide school transport?", a: "Yes, we offer safe and reliable school transport services within Nanyuki and surrounding areas." },
  { q: "What extracurricular activities do you offer?", a: "We offer sports, music, drama, debate, scouting, and various clubs to develop well-rounded learners." },
  { q: "Is there a school uniform?", a: "Yes, all students are required to wear the prescribed school uniform, which can be purchased from the school office." },
  { q: "How can I track my child's academic progress?", a: "Parents can access progress reports through the VORA portal and attend regular parent-teacher meetings." },
];

function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="space-y-3 mt-8">
      {items.map((item, i) => (
        <ScrollReveal key={i} delay={i * 60}>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all">
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-medium text-bdja-dark text-sm flex items-center gap-3">
                <HelpCircle className="w-4 h-4 text-bdja-primary flex-shrink-0" />
                {item.q}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                  openIdx === i ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight: openIdx === i ? 200 : 0,
                opacity: openIdx === i ? 1 : 0,
              }}
            >
              <div className="px-4 pb-4 pl-11">
                <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}

export default function FaqsPage() {
  const fallbackContent = (
    <div className="space-y-4">
      <p className="text-lg text-gray-600 leading-relaxed">
        Find answers to the most commonly asked questions about Bishop Davis Joy Academy.
      </p>
      <FaqAccordion items={fallbackFaqs} />
    </div>
  );

  return (
    <PublicLayout>
      <CmsPageContent
        slug="faqs"
        fallbackTitle="Frequently Asked Questions"
        fallbackContent={fallbackContent}
        metaDescription="Frequently asked questions about Bishop Davis Joy Academy."
      />
    </PublicLayout>
  );
}
