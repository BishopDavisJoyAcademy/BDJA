"use client";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { Phone, Mail, MapPin } from "lucide-react";

export default function AdmissionsPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-6">Admissions</h1>
        <p className="text-gray-600 mb-8">Join Bishop Davis Joy Academy and give your child the gift of quality education. We accept admissions for Playgroup through Grade 6.</p>
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gray-50 rounded-xl p-5 text-center">
            <Phone className="w-8 h-8 text-[#1e3a5f] mx-auto mb-3" />
            <p className="font-semibold text-sm">Call Us</p>
            <p className="text-sm text-gray-500">0708 449 158</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-5 text-center">
            <Mail className="w-8 h-8 text-[#1e3a5f] mx-auto mb-3" />
            <p className="font-semibold text-sm">Email Us</p>
            <p className="text-sm text-gray-500">bishopdavisjoyacademy@gmail.com</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-5 text-center">
            <MapPin className="w-8 h-8 text-[#1e3a5f] mx-auto mb-3" />
            <p className="font-semibold text-sm">Visit Us</p>
            <p className="text-sm text-gray-500">Near Peaks Hotel, Nanyuki</p>
          </div>
        </div>
        <div className="bg-[#1e3a5f] text-white rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Ready to Enroll?</h2>
          <p className="text-white/80 mb-4">Contact us today to schedule a school tour or begin the application process.</p>
          <a href="tel:0708449158" className="inline-block px-6 py-3 bg-[#c9a227] text-white font-medium rounded-lg hover:opacity-90 transition-opacity">
            Call Now: 0708 449 158
          </a>
        </div>
      </div>
    </PublicLayout>
  );
}
