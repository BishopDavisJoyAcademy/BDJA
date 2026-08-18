"use client";

import { HelpCircle, Mail, Phone } from "lucide-react";

export default function HelpPage() {
  return (
    <>
    <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-6">Help Desk</h1>
        <p className="text-gray-600 mb-10">Need assistance? We are here to help.</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <Phone className="w-10 h-10 text-[#1e3a5f] mx-auto mb-4" />
            <h3 className="font-semibold text-[#1e3a5f] mb-1">Call Support</h3>
            <p className="text-sm text-gray-600">0708 449 158</p>
            <p className="text-xs text-gray-400">Mon-Fri, 8AM - 5PM</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <Mail className="w-10 h-10 text-[#1e3a5f] mx-auto mb-4" />
            <h3 className="font-semibold text-[#1e3a5f] mb-1">Email Support</h3>
            <p className="text-sm text-gray-600">bishopdavisjoyacademy@gmail.com</p>
            <p className="text-xs text-gray-400">We respond within 24 hours</p>
          </div>
        </div>
        <div className="mt-10 bg-[#1e3a5f] text-white rounded-2xl p-8 text-center">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 text-[#c9a227]" />
          <h2 className="text-xl font-bold mb-2">Still Need Help?</h2>
          <p className="text-white/80 mb-4">Our support team is ready to assist you with any questions or concerns.</p>
          <a href="mailto:bishopdavisjoyacademy@gmail.com" className="inline-block px-6 py-3 bg-[#c9a227] text-white font-medium rounded-lg hover:opacity-90 transition-opacity">
            Contact Support
          </a>
        </div>
      </div>
    </>
  );
}
