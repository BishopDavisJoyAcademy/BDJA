"use client";

import { useState } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { CmsPageContent } from "@/components/CmsPageContent";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Phone, Mail, MapPin, Clock, Send, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  const fallbackContent = (
    <div className="space-y-8">
      <p className="text-lg text-gray-600 leading-relaxed">
        We would love to hear from you. Reach out to us through any of the channels below.
      </p>

      <div className="grid lg:grid-cols-2 gap-8 mt-8">
        <ScrollReveal>
          <div className="space-y-4">
            {[
              { icon: Phone, label: "Phone", value: "0708 449 158", href: "tel:0708449158" },
              { icon: Mail, label: "Email", value: "bishopdavisjoyacademy@gmail.com", href: "mailto:bishopdavisjoyacademy@gmail.com" },
              { icon: MapPin, label: "Address", value: "Near Peaks Hotel, Nanyuki, Kenya", href: "#" },
              { icon: Clock, label: "Office Hours", value: "Mon - Fri: 8:00 AM - 4:00 PM", href: "#" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-bdja-primary/20 transition-all group"
              >
                <div className="w-12 h-12 bg-bdja-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-bdja-primary group-hover:text-white transition-colors">
                  <item.icon className="w-5 h-5 text-bdja-primary group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm font-medium text-bdja-dark">{item.value}</p>
                </div>
              </a>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-bdja-primary mb-4">Send us a Message</h3>
            {sent ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                <p className="font-semibold text-bdja-dark">Message Sent!</p>
                <p className="text-sm text-gray-500">We will get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Your Name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary focus:border-transparent"
                  />
                  <input
                    type="email"
                    placeholder="Your Email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary focus:border-transparent"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Subject"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary focus:border-transparent"
                />
                <textarea
                  placeholder="Your Message"
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary focus:border-transparent resize-none"
                />
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-bdja-primary text-white font-medium rounded-xl hover:bg-bdja-accent transition-all hover:scale-[1.02]"
                >
                  <Send className="w-4 h-4" /> Send Message
                </button>
              </form>
            )}
          </div>
        </ScrollReveal>
      </div>
    </div>
  );

  return (
    <PublicLayout>
      <CmsPageContent
        slug="contact"
        fallbackTitle="Contact Us"
        fallbackContent={fallbackContent}
        metaDescription="Contact Bishop Davis Joy Academy - phone, email, and location."
      />
    </PublicLayout>
  );
}
