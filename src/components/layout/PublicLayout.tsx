"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Mail, BookOpen, GraduationCap, Users, Library, HelpCircle, Download,
  Search, Menu, X, ArrowRight, Send, XCircle, CheckCircle
} from "lucide-react";

const topLinks = [
  { label: "Student/Staff Email", action: "contact", icon: Mail },
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
    <div className="min-h-screen flex flex-col relative" style={{ background: '#0a1628' }}>
      {/* Logo watermark — visible everywhere behind content */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <Image src="/logo.png" alt="" width={500} height={500} className="object-contain opacity-[0.035]" />
      </div>

      {/* ===== TOP UTILITY BAR ===== */}
      <div className="relative z-50 shrink-0" style={{ background: 'linear-gradient(90deg, #070f1a 0%, #0a1628 50%, #070f1a 100%)', borderBottom: '1px solid rgba(212,168,67,0.1)' }}>
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-5">
            {topLinks.map((link) => {
              const Icon = link.icon;
              if (link.action === "contact") {
                return (
                  <button key={link.label} onClick={() => setContactOpen(true)} className="flex items-center gap-1.5 text-white/60 hover:text-[#d4a843] transition-colors text-xs">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{link.label}</span>
                  </button>
                );
              }
              return (
                <Link key={link.label} href={link.href!} className="flex items-center gap-1.5 text-white/60 hover:text-[#d4a843] transition-colors text-xs">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login?portal=student" className="text-white/60 hover:text-[#d4a843] transition-colors text-xs font-medium">Student Portal</Link>
            <span className="text-white/15">|</span>
            <Link href="/login?portal=staff" className="text-white/60 hover:text-[#d4a843] transition-colors text-xs font-medium">Staff Portal</Link>
          </div>
        </div>
      </div>

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 shrink-0" style={{ background: 'rgba(10, 22, 40, 0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(212, 168, 67, 0.08)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow" style={{ boxShadow: '0 0 15px rgba(212,168,67,0.2)' }}>
                <Image src="/logo.png" alt="BDJA Logo" fill className="object-contain p-0.5" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-white leading-tight tracking-tight">BISHOP DAVIS JOY ACADEMY</h1>
                <p className="text-[10px] text-white/40 tracking-wide">Nurturing Young Minds, Building Bright Futures</p>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="relative px-3 py-2 text-sm font-medium text-white/60 hover:text-[#d4a843] transition-colors group">
                  {link.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[#d4a843] rounded-full group-hover:w-3/4 transition-all duration-300" />
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button onClick={() => setSearchOpen(!searchOpen)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors">
                <Search className="w-4 h-4 text-white/50" />
              </button>
              <Link href="/admissions" className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)', boxShadow: '0 4px 20px rgba(212,168,67,0.3)' }}>
                Apply Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors">
                {mobileMenuOpen ? <X className="w-5 h-5 text-white/70" /> : <Menu className="w-5 h-5 text-white/70" />}
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="pb-3 animate-fade-in">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type="text" placeholder="Search..." autoFocus className="w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#d4a843]/30" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(212,168,67,0.15)' }} />
              </div>
            </div>
          )}
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t animate-fade-in" style={{ background: 'rgba(10, 22, 40, 0.98)', backdropFilter: 'blur(20px)', borderColor: 'rgba(212,168,67,0.08)' }}>
            <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-white/60 hover:text-[#d4a843] hover:bg-white/5 rounded-xl transition-colors">
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t mt-2" style={{ borderColor: 'rgba(212,168,67,0.1)' }}>
                <Link href="/admissions" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 text-sm font-semibold text-white rounded-xl text-center" style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}>
                  Apply Now
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 relative z-10">{children}</main>

      {/* ===== FOOTER ===== */}
      <footer className="relative z-10 shrink-0" style={{ background: 'linear-gradient(180deg, #070f1a 0%, #0a1628 100%)', borderTop: '1px solid rgba(212,168,67,0.1)' }}>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #d4a843, #c9a227, #d4a843, transparent)' }} />
        <div className="max-w-7xl mx-auto px-4 py-14 relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Newsletter</h4>
              <p className="text-white/40 text-xs leading-relaxed mb-4">Subscribe to get the latest news and updates.</p>
              <div className="space-y-2">
                <input type="email" placeholder="Enter your email" className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/20 border focus:outline-none focus:border-[#d4a843]/50 transition-colors" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }} />
                <button className="w-full px-3 py-2 text-sm font-medium text-white rounded-xl transition-all hover:brightness-110" style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}>Subscribe</button>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {["About Us", "Academics", "Admissions", "Students", "News & Events", "Contact Us"].map((item) => (
                  <li key={item}><Link href={`/${item.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`} className="text-white/40 text-xs hover:text-[#d4a843] transition-colors">{item}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Student Portal</h4>
              <ul className="space-y-2">
                {["VORA", "Student Email", "Student Portal", "Library", "Help Desk", "Downloads"].map((item) => (
                  <li key={item}><Link href={`/${item.toLowerCase().replace(/ /g, "-")}`} className="text-white/40 text-xs hover:text-[#d4a843] transition-colors">{item}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Resources</h4>
              <ul className="space-y-2">
                {["Downloads", "Policies", "Calendar", "Photo Gallery", "FAQs"].map((item) => (
                  <li key={item}><Link href={`/${item.toLowerCase().replace(/ /g, "-")}`} className="text-white/40 text-xs hover:text-[#d4a843] transition-colors">{item}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Contact Us</h4>
              <ul className="space-y-3">
                <li className="text-white/40 text-xs">Near Peaks Hotel, Nanyuki, Kenya</li>
                <li><a href="tel:0708449158" className="text-white/40 text-xs hover:text-[#d4a843] transition-colors">0708 449 158</a></li>
                <li><a href="mailto:bishopdavisjoyacademy@gmail.com" className="text-white/40 text-xs hover:text-[#d4a843] transition-colors">bishopdavisjoyacademy@gmail.com</a></li>
                <li className="text-white/40 text-xs">www.bdja.ac.ke</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white/20 text-xs">&copy; {new Date().getFullYear()} Bishop Davis Joy Academy. All Rights Reserved.</p>
            <p className="text-white/20 text-xs flex items-center gap-1">Designed with <span className="text-[#d4a843]">♡</span> by BDJA ICT Team</p>
          </div>
        </div>
      </footer>

      {/* ===== QUICK CONTACT MODAL ===== */}
      {contactOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(7,15,26,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in" style={{ background: 'linear-gradient(145deg, #0f1f33 0%, #0a1628 100%)', border: '1px solid rgba(212,168,67,0.2)' }}>
            <button onClick={() => setContactOpen(false)} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
              <XCircle className="w-5 h-5" />
            </button>
            {contactSent ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-[#d4a843] mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">Opening Email App</h3>
                <p className="text-white/40 text-sm">Your message is ready to send to BDJA.</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  <Send className="w-5 h-5 text-[#d4a843]" /> Send a Message
                </h3>
                <p className="text-white/30 text-xs mb-5">Reach out to Bishop Davis Joy Academy directly.</p>
                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <input type="text" placeholder="Your Name" required value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20 border focus:outline-none focus:border-[#d4a843]/50 transition-colors" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }} />
                  <input type="email" placeholder="Your Email" required value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20 border focus:outline-none focus:border-[#d4a843]/50 transition-colors" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }} />
                  <textarea placeholder="Your Message" required rows={4} value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20 border focus:outline-none focus:border-[#d4a843]/50 transition-colors resize-none" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }} />
                  <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white font-bold rounded-xl transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}>
                    <Send className="w-4 h-4" /> Send Message
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
