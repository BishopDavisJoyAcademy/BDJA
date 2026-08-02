"use client";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { CmsPageContent } from "@/components/CmsPageContent";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Shield, FileCheck, Users, HeartPulse, Bus, Shirt } from "lucide-react";

export default function PoliciesPage() {
  const fallbackContent = (
    <div className="space-y-8">
      <p className="text-lg text-gray-600 leading-relaxed">
        Our school policies ensure a safe, nurturing, and productive learning environment for all students.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {[
          { icon: FileCheck, title: "Attendance Policy", desc: "Regular attendance is essential for academic success. Students must attend all scheduled classes." },
          { icon: Users, title: "Behavior Policy", desc: "We promote respect, kindness, and responsibility. Bullying and misconduct are not tolerated." },
          { icon: Shirt, title: "Uniform Policy", desc: "All students must wear the prescribed school uniform neatly and appropriately." },
          { icon: HeartPulse, title: "Health & Safety", desc: "We maintain high standards of hygiene and safety. First aid is available at all times." },
          { icon: Bus, title: "Transport Policy", desc: "School transport is available with trained drivers and safety protocols." },
          { icon: Shield, title: "Data Protection", desc: "Student and family data is handled with strict confidentiality and security." },
        ].map((policy, i) => (
          <ScrollReveal key={policy.title} delay={i * 80}>
            <div className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-lg hover:border-bdja-primary/20 transition-all duration-300 hover:-translate-y-1 h-full">
              <policy.icon className="w-7 h-7 text-bdja-primary mb-3" />
              <h4 className="font-semibold text-bdja-dark text-sm mb-1">{policy.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{policy.desc}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );

  return (
    <PublicLayout>
      <CmsPageContent
        slug="policies"
        fallbackTitle="School Policies"
        fallbackContent={fallbackContent}
        metaDescription="School policies at Bishop Davis Joy Academy."
      />
    </PublicLayout>
  );
}
