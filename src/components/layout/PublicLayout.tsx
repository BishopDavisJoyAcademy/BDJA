"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Mail, BookOpen, GraduationCap, Users, Library, HelpCircle, Download,
  Search, Menu, X, ChevronDown, Phone, MapPin, Facebook, Twitter,
  Instagram, Youtube, Globe, ArrowRight, Sparkles
} from "lucide-react";

const topLinks = [
  { label: "Student/Staff Email", href: "https://mail.google.com", icon: Mail },
  { label: "VORA", href: "/vora", icon: BookOpen },
  { label: "Student/Staff Portal", href: "/login", icon: GraduationCap },
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

  return (
    <div className="min-h-screen font-sans text-gray-800" style={{ background: 'linear-gradient(180deg, #f5f0e8 0%, #ebe5d8 100%)' }}>
      {/* ===== TOP UTILITY BAR ===== */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(90deg, #0a1628 0%, #1e3a5f 50%, #0f1f33 100%)' }}>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 relative">
          <div className="flex flex-wrap items-center gap-5">
            {topLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.label} href={link.href} className="flex items-center gap-1.5 text-white/80 hover:text-[#d4a843] transition-colors text-xs">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login?portal=student" className="text-white/80 hover:text-[#d4a843] transition-colors text-xs font-medium">Student Portal</Link>
            <span className="text-white/20">|</span>
            <Link href="/login?portal=staff" className="text-white/80 hover:text-[#d4a843] transition-colors text-xs font-medium">Staff Portal</Link>
          </div>
        </div>
      </div>

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50" style={{
        background: 'rgba(245, 240, 232, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(30, 58, 95, 0.08)',
      }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                <Image src="/logo.png" alt="BDJA Logo" fill className="object-contain p-0.5" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-[#1e3a5f] leading-tight tracking-tight">BISHOP DAVIS JOY ACADEMY</h1>
                <p className="text-[10px] text-gray-500 tracking-wide">Nurturing Young Minds, Building Bright Futures</p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#1e3a5f] transition-colors group"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[#d4a843] rounded-full group-hover:w-3/4 transition-all duration-300" />
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#1e3a5f]/5 transition-colors"
              >
                <Search className="w-4 h-4 text-gray-500" />
              </button>
              <Link
                href="/admissions"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all duration-300 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}
              >
                Apply Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#1e3a5f]/5 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {searchOpen && (
            <div className="pb-3 animate-fade-in">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  autoFocus
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 text-sm"
                  style={{ background: 'rgba(255,255,255,0.8)' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 animate-fade-in" style={{ background: 'rgba(245, 240, 232, 0.98)', backdropFilter: 'blur(16px)' }}>
            <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5 rounded-xl transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-gray-100 mt-2">
                <Link
                  href="/admissions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm font-semibold text-white rounded-xl text-center"
                  style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}
                >
                  Apply Now
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main>{children}</main>

      {/* ===== FOOTER ===== */}
      <footer className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0f1f33 100%)' }}>
        {/* Decorative top border */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #d4a843, #c9a227, #d4a843)' }} />

        {/* Logo watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <Image src="/logo.png" alt="" width={400} height={400} className="object-contain" />
        </div>

        <div className="max-w-7xl mx-auto px-4 py-14 relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Newsletter */}
            <div className="lg:col-span-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#d4a843]" /> Newsletter
              </h4>
              <p className="text-white/50 text-xs leading-relaxed mb-4">Subscribe to get the latest news and updates.</p>
              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[#d4a843]/50 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                />
                <button className="w-full px-3 py-2 text-sm font-medium text-white rounded-xl transition-all hover:brightness-110" style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}>
                  Subscribe
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {["About Us", "Academics", "Admissions", "Students", "News & Events", "Contact Us"].map((item) => (
                  <li key={item}>
                    <Link href={`/${item.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`} className="text-white/50 text-xs hover:text-[#d4a843] transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Student Portal */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Student Portal</h4>
              <ul className="space-y-2">
                {["VORA", "Student Email", "Student Portal", "Library", "Help Desk", "Downloads"].map((item) => (
                  <li key={item}>
                    <Link href={`/${item.toLowerCase().replace(/ /g, "-")}`} className="text-white/50 text-xs hover:text-[#d4a843] transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Resources</h4>
              <ul className="space-y-2">
                {["Downloads", "Policies", "Calendar", "Photo Gallery", "FAQs"].map((item) => (
                  <li key={item}>
                    <Link href={`/${item.toLowerCase().replace(/ /g, "-")}`} className="text-white/50 text-xs hover:text-[#d4a843] transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Contact Us</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-white/50 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-[#d4a843] flex-shrink-0 mt-0.5" />
                  <span>Near Peaks Hotel, Nanyuki, Kenya</span>
                </li>
                <li className="flex items-center gap-2 text-white/50 text-xs">
                  <Phone className="w-3.5 h-3.5 text-[#d4a843] flex-shrink-0" />
                  <a href="tel:0708449158" className="hover:text-[#d4a843] transition-colors">0708 449 158</a>
                </li>
                <li className="flex items-center gap-2 text-white/50 text-xs">
                  <Mail className="w-3.5 h-3.5 text-[#d4a843] flex-shrink-0" />
                  <a href="mailto:bishopdavisjoyacademy@gmail.com" className="hover:text-[#d4a843] transition-colors">bishopdavisjoyacademy@gmail.com</a>
                </li>
                <li className="flex items-center gap-2 text-white/50 text-xs">
                  <Globe className="w-3.5 h-3.5 text-[#d4a843] flex-shrink-0" />
                  <span>www.bdja.ac.ke</span>
                </li>
              </ul>
              <div className="flex items-center gap-2 mt-4">
                {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-[#d4a843]/20 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-white/50 hover:text-[#d4a843]" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white/30 text-xs">&copy; {new Date().getFullYear()} Bishop Davis Joy Academy. All Rights Reserved.</p>
            <p className="text-white/30 text-xs flex items-center gap-1">
              Designed with <span className="text-red-400">♡</span> by BDJA ICT Team
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
