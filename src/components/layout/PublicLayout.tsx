"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
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

const PUBLIC_PATHS = [
  "/",
  "/about",
  "/academics",
  "/admissions",
  "/contact",
  "/contacts",
  "/students",
  "/library",
  "/news-events",
  "/downloads",
  "/help",
  "/notices",
  "/vora",
  "/gallery",
  "/policies",
  "/calendar",
  "/faqs",
];

function isPublicPage(pathname: string): boolean {
  // Exact match
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Sub-paths of public pages (e.g. /about/team)
  if (PUBLIC_PATHS.some((p) => p !== "/" && pathname.startsWith(p + "/"))) return true;
  return false;
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = isPublicPage(pathname || "");

  // On non-public pages (dashboard, auth, etc.), render children bare
  // without the public chrome (utility bar, nav, footer)
  if (!isPublic) {
    return <>{children}</>;
  }

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
                <button className="w-full px-3 py-2 text-sm font-medium text-slate-950 rounded-xl transition-colors hover:opacity-90" style={{ background: GOLD }}>
                  <span className="flex items-center justify-center gap-2"><Send className="w-3.5 h-3.5" /> Subscribe</span>
                </button>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Quick Links</h4>
              <ul className="space-y-2.5">
                {navLinks.slice(0, 5).map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-slate-400 hover:text-[#D4AF37] text-xs transition-colors flex items-center gap-1.5">
                      <ArrowRight className="w-3 h-3" /> {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Resources</h4>
              <ul className="space-y-2.5">
                <li><Link href="/library" className="text-slate-400 hover:text-[#D4AF37] text-xs transition-colors flex items-center gap-1.5"><ArrowRight className="w-3 h-3" /> Library</Link></li>
                <li><Link href="/downloads" className="text-slate-400 hover:text-[#D4AF37] text-xs transition-colors flex items-center gap-1.5"><ArrowRight className="w-3 h-3" /> Downloads</Link></li>
                <li><Link href="/vora" className="text-slate-400 hover:text-[#D4AF37] text-xs transition-colors flex items-center gap-1.5"><ArrowRight className="w-3 h-3" /> VORA</Link></li>
                <li><Link href="/help" className="text-slate-400 hover:text-[#D4AF37] text-xs transition-colors flex items-center gap-1.5"><ArrowRight className="w-3 h-3" /> Help Desk</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Contact</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li className="flex items-start gap-2"><Mail className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" /> bishopdavisjoyacademy@gmail.com</li>
                <li className="flex items-start gap-2"><GraduationCap className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" /> BDJA Campus, Kenya</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Connect</h4>
              <div className="flex items-center gap-3">
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/40 flex items-center justify-center text-slate-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/40 flex items-center justify-center text-slate-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/40 flex items-center justify-center text-slate-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-600">&copy; {new Date().getFullYear()} Bishop Davis Joy Academy. All rights reserved.</p>
            <p className="text-[11px] text-slate-600">Prayer, Commitment & Hard Work</p>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      <AnimatePresence>
        {contactOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setContactOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Contact Us</h3>
                <button onClick={() => setContactOpen(false)} className="p-1 text-slate-500 hover:text-white transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              {contactSent ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                  <p className="text-white font-medium">Message sent!</p>
                  <p className="text-slate-400 text-sm mt-1">We will get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <input type="text" placeholder="Your name" required value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]/30" />
                  <input type="email" placeholder="Your email" required value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]/30" />
                  <textarea placeholder="Your message" required rows={4} value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]/30 resize-none" />
                  <button type="submit" className="w-full px-4 py-2.5 text-sm font-medium text-slate-950 rounded-xl transition-colors hover:opacity-90" style={{ background: GOLD }}>
                    Send Message
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
