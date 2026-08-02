"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Home, Search, BookOpen, GraduationCap, Mail, ArrowRight,
  Compass, Sparkles
} from "lucide-react";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const suggestions = [
    { icon: Home, label: "Homepage", desc: "Back to the beginning", href: "/", color: "#d4a843" },
    { icon: BookOpen, label: "Academics", desc: "Explore our programs", href: "/academics", color: "#2a9d8f" },
    { icon: GraduationCap, label: "Admissions", desc: "Join BDJA today", href: "/admissions", color: "#e74c3c" },
    { icon: Mail, label: "Contact Us", desc: "Get in touch", href: "/contact", color: "#3498db" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1e3a5f 40%, #0f1f33 100%)' }}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #d4a843 0%, transparent 70%)', filter: 'blur(100px)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #2a9d8f 0%, transparent 70%)', filter: 'blur(100px)' }} />
        <div className="absolute top-[40%] right-[20%] w-[200px] h-[200px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #d4a843 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
        {/* Animated illustration */}
        <div className={`mb-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="relative w-64 h-64 mx-auto">
            {/* Floating elements */}
            <div className="absolute top-4 left-8 w-6 h-6 rounded-full animate-float" style={{ background: '#d4a843', opacity: 0.3, animationDelay: '0s' }} />
            <div className="absolute top-12 right-12 w-4 h-4 rounded-full animate-float" style={{ background: '#2a9d8f', opacity: 0.3, animationDelay: '0.5s' }} />
            <div className="absolute bottom-8 left-16 w-5 h-5 rounded-full animate-float" style={{ background: '#d4a843', opacity: 0.2, animationDelay: '1s' }} />
            <div className="absolute bottom-16 right-8 w-3 h-3 rounded-full animate-float" style={{ background: '#2a9d8f', opacity: 0.25, animationDelay: '1.5s' }} />

            {/* Compass / Lost illustration */}
            <svg viewBox="0 0 256 256" className="w-full h-full drop-shadow-2xl">
              {/* Outer ring */}
              <circle cx="128" cy="128" r="100" fill="none" stroke="#d4a843" strokeWidth="2" opacity="0.3" />
              <circle cx="128" cy="128" r="90" fill="none" stroke="#d4a843" strokeWidth="1" opacity="0.15" strokeDasharray="8 4" className="animate-spin-slow" style={{ transformOrigin: '128px 128px' }} />

              {/* Inner ring */}
              <circle cx="128" cy="128" r="60" fill="none" stroke="#2a9d8f" strokeWidth="1.5" opacity="0.2" />

              {/* Compass needle */}
              <g className="animate-float" style={{ transformOrigin: '128px 128px' }}>
                <polygon points="128,48 138,128 128,208 118,128" fill="#d4a843" opacity="0.6" />
                <polygon points="128,48 138,128 128,108 118,128" fill="#e8c97a" opacity="0.8" />
                <circle cx="128" cy="128" r="8" fill="#0a1628" stroke="#d4a843" strokeWidth="2" />
              </g>

              {/* Cardinal points */}
              <text x="128" y="35" textAnchor="middle" fill="#d4a843" fontSize="14" fontWeight="bold" opacity="0.6">N</text>
              <text x="128" y="225" textAnchor="middle" fill="#d4a843" fontSize="14" fontWeight="bold" opacity="0.4">S</text>
              <text x="35" y="133" textAnchor="middle" fill="#2a9d8f" fontSize="14" fontWeight="bold" opacity="0.4">W</text>
              <text x="221" y="133" textAnchor="middle" fill="#2a9d8f" fontSize="14" fontWeight="bold" opacity="0.4">E</text>

              {/* Decorative stars */}
              <circle cx="80" cy="80" r="2" fill="white" opacity="0.3" />
              <circle cx="180" cy="70" r="1.5" fill="white" opacity="0.2" />
              <circle cx="200" cy="150" r="2" fill="white" opacity="0.25" />
              <circle cx="60" cy="170" r="1.5" fill="white" opacity="0.2" />
            </svg>
          </div>
        </div>

        {/* Text content */}
        <div className={`transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-5" style={{ background: 'rgba(212,168,67,0.15)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.3)' }}>
            <Compass className="w-3.5 h-3.5" /> Page Not Found
          </div>

          <h1 className="text-6xl md:text-8xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            4<span style={{ color: '#d4a843' }}>0</span>4
          </h1>

          <h2 className="text-xl md:text-2xl font-semibold text-white/80 mb-3">
            Looks like nothing is here
          </h2>

          <p className="text-white/40 text-sm md:text-base max-w-md mx-auto mb-10 leading-relaxed">
            The page you&apos;re looking for seems to have wandered off. Don&apos;t worry — let us help you find your way back.
          </p>
        </div>

        {/* Suggestion cards */}
        <div className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10 transition-all duration-1000 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {suggestions.map((item, i) => (
            <Link
              key={item.label}
              href={item.href}
              className="group relative rounded-xl p-4 text-left transition-all duration-300 hover:scale-[1.03]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                background: `radial-gradient(circle at 50% 0%, ${item.color}15 0%, transparent 70%)`,
              }} />
              <div className="relative">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <p className="text-sm font-semibold text-white group-hover:text-white transition-colors">{item.label}</p>
                <p className="text-xs text-white/30 mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Back home button */}
        <div className={`transition-all duration-1000 delay-600 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 text-white font-bold rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}
          >
            <Home className="w-5 h-5" /> Take Me Home <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Footer */}
        <div className={`mt-16 pt-6 border-t border-white/5 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-white/20 text-xs">
            &copy; {new Date().getFullYear()} Bishop Davis Joy Academy. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
