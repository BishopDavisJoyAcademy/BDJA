"use client";

import { GraduationCap } from "lucide-react";

const grades = [
  { name: "Playgroup", ages: "Ages 2-3", desc: "Early childhood development through play-based learning." },
  { name: "Pre-Primary 1", ages: "Ages 3-4", desc: "Foundation skills in literacy and numeracy." },
  { name: "Pre-Primary 2", ages: "Ages 4-5", desc: "Advanced pre-primary preparation for Grade 1." },
  { name: "Grade 1", ages: "Ages 5-6", desc: "Introduction to CBC with focus on core competencies." },
  { name: "Grade 2", ages: "Ages 6-7", desc: "Building foundational academic and life skills." },
  { name: "Grade 3", ages: "Ages 7-8", desc: "Strengthening literacy, numeracy, and creativity." },
  { name: "Grade 4", ages: "Ages 8-9", desc: "Intermediate CBC with project-based learning." },
  { name: "Grade 5", ages: "Ages 9-10", desc: "Advanced competencies and critical thinking." },
  { name: "Grade 6", ages: "Ages 10-11", desc: "Preparation for junior secondary transition." },
];

export default function AcademicsPage() {
  return (
    <>
    <div className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-4">Academics</h1>
        <p className="text-gray-600 mb-10">We follow the Competency Based Curriculum (CBC) designed to develop skills, knowledge, and attitudes for holistic growth.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grades.map((g) => (
            <div key={g.name} className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all hover:-translate-y-1">
              <GraduationCap className="w-8 h-8 text-[#1e3a5f] mb-3" />
              <h3 className="font-semibold text-[#1e3a5f]">{g.name}</h3>
              <p className="text-xs text-gray-400 mb-2">{g.ages}</p>
              <p className="text-sm text-gray-600">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
