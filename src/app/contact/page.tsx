"use client";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { Phone, Mail, MapPin, Globe } from "lucide-react";

export default function ContactPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#1e3a5f] mb-6">Contact Us</h1>
        <p className="text-gray-600 mb-10">We would love to hear from you. Reach out to us through any of the channels below.</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl">
              <MapPin className="w-6 h-6 text-[#1e3a5f] flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#1e3a5f]">Address</h3>
                <p className="text-sm text-gray-600">P.O. Box 3013-10400<br />Near Peaks Hotel, Nanyuki–Nturukuma, Kenya</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl">
              <Phone className="w-6 h-6 text-[#1e3a5f] flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#1e3a5f]">Phone</h3>
                <p className="text-sm text-gray-600">0708 449 158</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl">
              <Mail className="w-6 h-6 text-[#1e3a5f] flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#1e3a5f]">Email</h3>
                <p className="text-sm text-gray-600">bishopdavisjoyacademy@gmail.com</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl">
              <Globe className="w-6 h-6 text-[#1e3a5f] flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#1e3a5f]">Website</h3>
                <p className="text-sm text-gray-600">www.bdja.ac.ke</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-semibold text-[#1e3a5f] mb-4">Send us a Message</h3>
            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <input type="text" placeholder="Your Name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
              <input type="email" placeholder="Your Email" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
              <textarea placeholder="Your Message" rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
              <button type="submit" className="w-full px-4 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#2d5a87] transition-colors">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
