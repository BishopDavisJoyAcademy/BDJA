"use client";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { CmsPageContent } from "@/components/CmsPageContent";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Phone, Mail, MapPin, Calendar, FileText, CheckCircle } from "lucide-react";

export default function AdmissionsPage() {
  const fallbackContent = (
    <div className="space-y-8">
      <p className="text-lg text-gray-600 leading-relaxed">
        Join Bishop Davis Joy Academy and give your child the gift of quality education.
        We accept admissions for Playgroup through Grade 6.
      </p>

      <ScrollReveal>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            { icon: Phone, label: "Call Us", value: "0708 449 158", href: "tel:0708449158" },
            { icon: Mail, label: "Email Us", value: "bishopdavisjoyacademy@gmail.com", href: "mailto:bishopdavisjoyacademy@gmail.com" },
            { icon: MapPin, label: "Visit Us", value: "Near Peaks Hotel, Nanyuki", href: "#" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="bg-white border border-gray-100 rounded-xl p-5 text-center hover:shadow-lg hover:border-bdja-primary/20 transition-all duration-300 hover:-translate-y-1 group"
            >
              <item.icon className="w-8 h-8 text-bdja-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-semibold text-sm text-bdja-dark">{item.label}</p>
              <p className="text-sm text-gray-500 mt-1">{item.value}</p>
            </a>
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal delay={150}>
        <div className="mt-10">
          <h3 className="text-xl font-bold text-bdja-primary mb-4">Admission Process</h3>
          <div className="space-y-3">
            {[
              { step: 1, title: "Inquiry", desc: "Contact us or visit the school" },
              { step: 2, title: "School Tour", desc: "Schedule a visit to see our facilities" },
              { step: 3, title: "Application", desc: "Fill out the admission form" },
              { step: 4, title: "Assessment", desc: "Age-appropriate assessment" },
              { step: 5, title: "Enrollment", desc: "Complete registration and pay fees" },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-4 bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-bdja-primary text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  {s.step}
                </div>
                <div>
                  <h4 className="font-semibold text-bdja-dark text-sm">{s.title}</h4>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={200}>
        <div className="bg-gradient-to-r from-bdja-primary to-bdja-accent rounded-2xl p-8 text-center mt-10">
          <h2 className="text-xl font-bold text-white mb-2">Ready to Enroll?</h2>
          <p className="text-white/80 mb-5 text-sm">Contact us today to schedule a school tour or begin the application process.</p>
          <a
            href="tel:0708449158"
            className="inline-flex items-center gap-2 px-6 py-3 bg-bdja-secondary text-white font-medium rounded-xl hover:brightness-110 transition-all hover:scale-105"
          >
            <Phone className="w-4 h-4" /> Call Now: 0708 449 158
          </a>
        </div>
      </ScrollReveal>
    </div>
  );

  return (
    <PublicLayout>
      <CmsPageContent
        slug="admissions"
        fallbackTitle="Admissions"
        fallbackContent={fallbackContent}
        metaDescription="Admission information for Bishop Davis Joy Academy - Playgroup to Grade 6."
      />
    </PublicLayout>
  );
}
