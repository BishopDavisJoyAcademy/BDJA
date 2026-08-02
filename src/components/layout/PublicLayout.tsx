"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Mail, BookOpen, GraduationCap, Users, Library, HelpCircle, Download,
  Search, Menu, X, ChevronDown, Phone, MapPin, Facebook, Twitter,
  Instagram, Youtube, Globe, ArrowRight
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

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      {/* Top Utility Bar */}
      <div className="bg-[#1e3a5f] text-white text-xs border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-4">
            {topLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.label} href={link.href} className="flex items-center gap-1.5 hover:text-[#c9a227] transition-colors">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login?portal=student" className="hover:text-[#c9a227] transition-colors">Student Portal</Link>
            <span className="text-white/30">|</span>
            <Link href="/login?portal=staff" className="hover:text-[#c9a227] transition-colors">Staff Portal</Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <Image src="/logo.png" alt="BDJA Logo" width={40} height={40} className="object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1e3a5f] leading-tight tracking-wide">BISHOP DAVIS JOY ACADEMY</h1>
              <p className="text-xs text-gray-500">Nurturing Young Minds, Building Bright Futures</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-sm font-medium text-gray-700 hover:text-[#1e3a5f] transition-colors">
                {link.label}
              </Link>
            ))}
            <button className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <Search className="w-4 h-4 text-gray-500" />
            </button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link key={link.label} href={link.href} className="block py-2 text-sm font-medium text-gray-700 hover:text-[#1e3a5f]" onClick={() => setMobileMenuOpen(false)}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-[#1e3a5f] text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-5 gap-8">
            {/* Newsletter */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide mb-4">Newsletter</h4>
              <p className="text-xs text-gray-400 mb-3">Subscribe to our newsletter to get the latest news and updates.</p>
              <div className="space-y-2">
                <input type="email" placeholder="Enter your email" className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#c9a227]" />
                <button className="w-full px-3 py-2 bg-[#c9a227] text-white text-sm font-medium rounded hover:opacity-90 transition-opacity">
                  Subscribe
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-xs text-gray-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/academics" className="text-xs text-gray-400 hover:text-white transition-colors">Academics</Link></li>
                <li><Link href="/admissions" className="text-xs text-gray-400 hover:text-white transition-colors">Admissions</Link></li>
                <li><Link href="/students" className="text-xs text-gray-400 hover:text-white transition-colors">Students</Link></li>
                <li><Link href="/news-events" className="text-xs text-gray-400 hover:text-white transition-colors">News & Events</Link></li>
                <li><Link href="/contact" className="text-xs text-gray-400 hover:text-white transition-colors">Contact Us</Link></li>
              </ul>
            </div>

            {/* Student Portal */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide mb-4">Student Portal</h4>
              <ul className="space-y-2">
                <li><Link href="/vora" className="text-xs text-gray-400 hover:text-white transition-colors">VORA</Link></li>
                <li><Link href="https://mail.google.com" className="text-xs text-gray-400 hover:text-white transition-colors">Student Email</Link></li>
                <li><Link href="/login?portal=student" className="text-xs text-gray-400 hover:text-white transition-colors">Student Portal</Link></li>
                <li><Link href="/library" className="text-xs text-gray-400 hover:text-white transition-colors">Library</Link></li>
                <li><Link href="/help" className="text-xs text-gray-400 hover:text-white transition-colors">Help Desk</Link></li>
                <li><Link href="/downloads" className="text-xs text-gray-400 hover:text-white transition-colors">Downloads</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/downloads" className="text-xs text-gray-400 hover:text-white transition-colors">Downloads</Link></li>
                <li><Link href="/policies" className="text-xs text-gray-400 hover:text-white transition-colors">Policies</Link></li>
                <li><Link href="/calendar" className="text-xs text-gray-400 hover:text-white transition-colors">Calendar</Link></li>
                <li><Link href="/gallery" className="text-xs text-gray-400 hover:text-white transition-colors">Photo Gallery</Link></li>
                <li><Link href="/faqs" className="text-xs text-gray-400 hover:text-white transition-colors">FAQs</Link></li>
              </ul>
            </div>

            {/* Contact Us */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide mb-4">Contact Us</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-xs text-gray-400">
                  <MapPin className="w-4 h-4 text-[#c9a227] flex-shrink-0 mt-0.5" />
                  <span>P.O. Box 3013-10400<br />Near Peaks Hotel, Nanyuki–Nturukuma, Kenya</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-400">
                  <Phone className="w-4 h-4 text-[#c9a227] flex-shrink-0" />
                  <span>0708 449 158</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-400">
                  <Mail className="w-4 h-4 text-[#c9a227] flex-shrink-0" />
                  <span>bishopdavisjoyacademy@gmail.com</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-400">
                  <Globe className="w-4 h-4 text-[#c9a227] flex-shrink-0" />
                  <span>www.bdja.ac.ke</span>
                </li>
              </ul>
              <div className="flex items-center gap-3 mt-4">
                <a href="https://facebook.com/bdja" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/10 rounded flex items-center justify-center hover:bg-[#c9a227] transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href="https://twitter.com/bdja" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/10 rounded flex items-center justify-center hover:bg-[#c9a227] transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="https://instagram.com/bdja" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/10 rounded flex items-center justify-center hover:bg-[#c9a227] transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="https://youtube.com/bdja" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/10 rounded flex items-center justify-center hover:bg-[#c9a227] transition-colors">
                  <Youtube className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">&copy; 2026 Bishop Davis Joy Academy. All Rights Reserved.</p>
            <p className="text-xs text-gray-500">Designed with care by BDJA ICT Team</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
