"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, BookOpen, GraduationCap, Library, HelpCircle, Download,
  Search, Menu, X, ArrowRight, Send, XCircle, CheckCircle
} from "lucide-react";

const GOLD = "#D4AF37";

const topLinks = [
  { label: "Student/Staff Email", action: "contact", icon: Mail },
  { label: "VORA", href: "/vora", icon: BookOpen },
  { label: "Library", href: "/library", icon: Library },
  { label: "Help Desk", href: "/help", icon: HelpCircle },
  { label: "Downloads", href: "/downloads", icon: Download },
];

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Academics", href: "/academics" },
  { label: "Admissions", href: "/admissions" },
  { label: "Students", href: "/students" },
  { label: "News & Events", href: "/news-events" },
  { label: "Contact Us", href: "/contact" },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactSent, setContactSent] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Message from ${contactForm.name} via BDJA Website`);
    const body = encodeURIComponent(`Name: ${contactForm.name}
Email: ${contactForm.email}

Message:
${contactForm.message}`);
    window.open(`mailto:bishopdavisjoyacademy@gmail.com?subject=${subject}&body=${body}`, "_blank");
    setContactSent(true);
    setTimeout(() => { setContactSent(false); setContactOpen(false); setContactForm({ name: "", email: "", message: "" }); }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-slate-950">
      {/* Subtle watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <Image src="/logo.png" alt="" width={400} height={400} className="object-contain opacity-[0.02]" />
      </div>

      {/* ===== TOP UTILITY BAR ===== */}
      <div className="relative z-50 shrink-0 bg-slate-900/80 border-b border-slate-800/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-4">
            {topLinks.map((link) => {
              const Icon = link.icon;
              if (link.action === "contact") {
                return (
                  <button key={link.label} onClick={() => setContactOpen(true)} className="flex items-center gap-1.5 text-slate-400 hover:text-[#D4AF37] transition-colors text-xs">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{link.label}</span>
                  </button>
                );
              }
              return (
                <Link key={link.label} href={link.href!} className="flex items-center gap-1.5 text-slate-400 hover:text-[#D4AF37] transition-colors text-xs">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="flex items-center gap-1.5 text-slate-400 hover:text-[#D4AF37] transition-colors text-xs">
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Student/Staff Portal</span>
            </Link>
            <span className="text-slate-700 text-xs">|</span>
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50">
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-800/50"
            >
              <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search the site..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37]/30"
                    onKeyDown={(e) => { if (e.key === "Enter") setSearchOpen(false); }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== MAIN NAVIGATION ===== */}
      <header className="relative z-40 shrink-0 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800/50 border border-slate-700/40 flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="BDJA" width={28} height={28} className="object-contain" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-white leading-tight">Bishop Davis Joy Academy</p>
              <p className="text-[10px] text-slate-500 leading-tight">Excellence in Education</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/40 rounded-lg transition-all"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/admissions"
              className="ml-2 px-4 py-2 text-slate-950 font-medium rounded-lg text-sm transition-colors hover:opacity-90"
              style={{ background: GOLD }}
            >
              Apply Now
            </Link>
          </nav>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden border-t border-slate-800/30"
            >
              <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/40 rounded-lg transition-all"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/admissions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 font-medium rounded-lg text-sm mt-2"
                  style={{ background: `${GOLD}10`, color: GOLD }}
                >
                  Apply Now
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 relative z-10">{children}</main>

      {/* ===== FOOTER ===== */}
      <footer className="relative z-10 shrink-0 bg-slate-900/60 border-t border-slate-800/40">
        <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${GOLD}30, transparent)` }} />
        <div className="max-w-7xl mx-auto px-4 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-1">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Newsletter</h4>
              <p className="text-slate-500 text-xs leading-relaxed mb-4">Subscribe to get the latest news and updates.</p>
              <div className="space-y-2">
                <input type="email" placeholder="Enter your email" className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-slate-600 bg-slate-800/40 border border-slate-700/40 focus:outline-none focus:border-[#D4AF37]/30 transition-colors" />
                <button className="w-full px-3 py-2 text-sm font-medium text-slate-950 rounded-xl transition-colors hover:opacity-90" style={{ background: GOLD }}>Subscribe</button>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {["About Us", "Academics", "Admissions", "Students", "News & Events", "Contact Us"].map((item) => (
                  <li key={item}>
                    <Link href={`/${item.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`} className="text-slate-500 text-xs hover:text-[#D4AF37] transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Student Portal</h4>
              <ul className="space-y-2">
                {["VORA", "Student Email", "Student Portal", "Library", "Help Desk", "Downloads"].map((item) => (
                  <li key={item}>
                    <Link href={item === "Student Portal" ? "/login" : `/${item.toLowerCase().replace(/ /g, "-")}`} className="text-slate-500 text-xs hover:text-[#D4AF37] transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Resources</h4>
              <ul className="space-y-2">
                {["Downloads", "Policies", "Calendar", "Photo Gallery", "FAQs"].map((item) => (
                  <li key={item}>
                    <Link href={`/${item.toLowerCase().replace(/ /g, "-")}`} className="text-slate-500 text-xs hover:text-[#D4AF37] transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Contact Us</h4>
              <ul className="space-y-3">
                <li className="text-slate-500 text-xs">Near Peaks Hotel, Nanyuki, Kenya</li>
                <li><a href="tel:0708449158" className="text-slate-500 text-xs hover:text-[#D4AF37] transition-colors">0708 449 158</a></li>
                <li><a href="mailto:bishopdavisjoyacademy@gmail.com" className="text-slate-500 text-xs hover:text-[#D4AF37] transition-colors">bishopdavisjoyacademy@gmail.com</a></li>
                <li className="text-slate-500 text-xs">www.bdja.ac.ke</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-slate-600 text-xs">&copy; {new Date().getFullYear()} Bishop Davis Joy Academy. All Rights Reserved.</p>
            <p className="text-slate-600 text-xs flex items-center gap-1">Designed with care by BDJA ICT Team</p>
          </div>
        </div>
      </footer>

      {/* ===== QUICK CONTACT MODAL ===== */}
      <AnimatePresence>
        {contactOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl p-6 bg-slate-900 border border-slate-700/40 shadow-2xl"
            >
              <button onClick={() => setContactOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
              {contactSent ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
                  <h3 className="text-base font-semibold text-white mb-1">Opening Email App</h3>
                  <p className="text-slate-500 text-sm">Your message is ready to send to BDJA.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                    <Send className="w-4 h-4" style={{ color: GOLD }} /> Send a Message
                  </h3>
                  <p className="text-slate-500 text-xs mb-5">Reach out to Bishop Davis Joy Academy directly.</p>
                  <form onSubmit={handleContactSubmit} className="space-y-3">
                    <input type="text" placeholder="Your Name" required value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 bg-slate-800/40 border border-slate-700/40 focus:outline-none focus:border-[#D4AF37]/30 transition-colors" />
                    <input type="email" placeholder="Your Email" required value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 bg-slate-800/40 border border-slate-700/40 focus:outline-none focus:border-[#D4AF37]/30 transition-colors" />
                    <textarea placeholder="Your Message" required rows={4} value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 bg-slate-800/40 border border-slate-700/40 focus:outline-none focus:border-[#D4AF37]/30 transition-colors resize-none" />
                    <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-2.5 text-slate-950 font-semibold rounded-xl transition-colors hover:opacity-90 text-sm" style={{ background: GOLD }}>
                      <Send className="w-4 h-4" /> Send Message
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
