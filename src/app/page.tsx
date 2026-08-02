"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ScrollReveal } from "@/components/ScrollReveal";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import {
  ChevronLeft, ChevronRight, FileText, GraduationCap,
  Users, BookOpen, Building, ArrowRight, Play, Pause,
  Sparkles, School, Star, Heart, Trophy, Lightbulb
} from "lucide-react";

const FALLBACK_SLIDES = [
  {
    id: "1",
    title: "A Happy Beginning",
    subtitle: "for a Bright Future",
    description: "Providing a safe, nurturing and stimulating environment where children grow, learn and shine.",
    button_text: "Discover More",
    button_link: "/about",
  },
  {
    id: "2",
    title: "Excellence in Education",
    subtitle: "CBC Curriculum",
    description: "Empowering children to make a difference in their lives, their community and the wider world.",
    button_text: "Learn More",
    button_link: "/academics",
  },
  {
    id: "3",
    title: "Nurturing Young Minds",
    subtitle: "Building Bright Futures",
    description: "Encouraging children in learning opportunity through prayer, commitment and hard work.",
    button_text: "Admissions",
    button_link: "/admissions",
  },
];

const FALLBACK_NOTICES = [
  { id: "1", title: "School Term II Resumes", notice_date: "2024-05-20", category: "Academic" },
  { id: "2", title: "Parent-Teacher Meeting", notice_date: "2024-05-15", category: "Meeting" },
  { id: "3", title: "Mid Term Break", notice_date: "2024-05-10", category: "Holiday" },
];

const FALLBACK_NEWS = [
  { id: "1", title: "Our Playgroup Graduation Ceremony", news_date: "2024-05-18" },
  { id: "2", title: "Grade 6 Learners Excel in National Assessment", news_date: "2024-05-12" },
  { id: "3", title: "Fun Day Activities Bring Learning to Life", news_date: "2024-05-05" },
];

const FALLBACK_DIRECTOR = {
  director_name: "Mr. John Doe",
  director_title: "Director",
  message: "Welcome to Bishop Davis Joy Academy Playgroup to Grade 6. We are committed to nurturing confident, curious and compassionate learners.",
};

const STATS = [
  { id: "1", label: "Happy Learners", value: 500, suffix: "+", icon: Users },
  { id: "2", label: "Dedicated Staff", value: 40, suffix: "+", icon: GraduationCap },
  { id: "3", label: "Years of Excellence", value: 10, suffix: "+", icon: Trophy },
  { id: "4", label: "Holistic Learning", value: 100, suffix: "%", icon: Heart },
];

const GRADES = [
  { key: "playgroup", name: "Playgroup", icon: "playgroup-icon.png", color: "#e74c3c" },
  { key: "pp1", name: "Pre-Primary", icon: "pp1-icon.png", color: "#e67e22" },
  { key: "pp2", name: "Pre-Primary 2", icon: "pp2-icon.png", color: "#f39c12" },
  { key: "grade1", name: "Grade 1", icon: "grade1-icon.png", color: "#27ae60" },
  { key: "grade2", name: "Grade 2", icon: "grade2-icon.png", color: "#16a085" },
  { key: "grade3", name: "Grade 3", icon: "grade3-icon.png", color: "#2980b9" },
  { key: "grade4", name: "Grade 4", icon: "grade4-icon.png", color: "#8e44ad" },
  { key: "grade5", name: "Grade 5", icon: "grade5-icon.png", color: "#c0392b" },
  { key: "grade6", name: "Grade 6", icon: "grade6-icon.png", color: "#2c3e50" },
];

// Duplicate for seamless marquee
const GRADES_DUP = [...GRADES, ...GRADES];

export default function HomePage() {
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [notices, setNotices] = useState(FALLBACK_NOTICES);
  const [news, setNews] = useState(FALLBACK_NEWS);
  const [director, setDirector] = useState(FALLBACK_DIRECTOR);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const heroRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [s, n, ns, dm] = await Promise.all([
          supabase.from("homepage_slides").select("*").eq("is_active", true).order("display_order"),
          supabase.from("homepage_notices").select("*").eq("is_active", true).order("notice_date", { ascending: false }).limit(5),
          supabase.from("homepage_news").select("*").eq("is_active", true).order("news_date", { ascending: false }).limit(5),
          supabase.from("homepage_director_message").select("*").eq("is_active", true).maybeSingle(),
        ]);
        if (s?.data?.length) setSlides(s.data);
        if (n?.data?.length) setNotices(n.data);
        if (ns?.data?.length) setNews(ns.data);
        if (dm?.data) setDirector(dm.data);
      } catch { /* fallback */ }
    };
    loadData();
  }, []);

  // Auto-slide with progress
  useEffect(() => {
    if (isPaused) { cancelAnimationFrame(rafRef.current); return; }
    const duration = 6000;
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      setProgress(Math.min(elapsed / duration, 1));
      if (elapsed >= duration) {
        goToSlide((currentSlide + 1) % slides.length);
        startTime = null;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentSlide, slides.length, isPaused]);

  const goToSlide = useCallback((index: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setProgress(0);
    setCurrentSlide(index);
    setTimeout(() => setIsAnimating(false), 800);
  }, [isAnimating]);

  const nextSlide = () => goToSlide((currentSlide + 1) % slides.length);
  const prevSlide = () => goToSlide((currentSlide - 1 + slides.length) % slides.length);

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return dateStr; }
  };

  const getCategoryColor = (cat: string) => {
    const map: Record<string, string> = {
      Academic: "#2980b9", Meeting: "#8e44ad", Holiday: "#27ae60",
      Urgent: "#e74c3c", General: "#7f8c8d", Event: "#f39c12",
    };
    return map[cat] || "#7f8c8d";
  };

  return (
    <PublicLayout>
      {/* ===== HERO SECTION ===== */}
      <section
        ref={heroRef}
        className="relative overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{ minHeight: "600px" }}
      >
        {/* Deep navy gradient background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1e3a5f 40%, #0f1f33 100%)' }} />

        {/* Logo watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
          <Image src="/logo.png" alt="" width={500} height={500} className="object-contain" />
        </div>

        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #d4a843 0%, transparent 70%)', filter: 'blur(80px)' }} />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #2a9d8f 0%, transparent 70%)', filter: 'blur(80px)' }} />
          <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #d4a843 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>

        {/* Decorative grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="relative min-h-[480px] md:min-h-[520px]">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`absolute inset-0 flex items-center transition-all duration-800 ease-out ${
                  idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                <div className="grid md:grid-cols-2 gap-10 items-center w-full">
                  {/* Left: Text */}
                  <div className="space-y-6 z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(212,168,67,0.15)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.3)' }}>
                      <Sparkles className="w-3.5 h-3.5" /> Welcome to BDJA
                    </div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {slide.title}
                      <span className="block mt-2" style={{ color: '#d4a843' }}>{slide.subtitle}</span>
                    </h2>
                    <p className="text-white/60 text-base md:text-lg max-w-lg leading-relaxed">
                      {slide.description}
                    </p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <Link
                        href={slide.button_link || "/about"}
                        className="inline-flex items-center gap-2 px-7 py-3.5 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-xl"
                        style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}
                      >
                        {slide.button_text || "Discover More"}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <Link
                        href="/admissions"
                        className="inline-flex items-center gap-2 px-7 py-3.5 font-semibold rounded-xl border transition-all duration-300 hover:scale-[1.03]"
                        style={{ borderColor: 'rgba(212,168,67,0.4)', color: '#d4a843' }}
                      >
                        Apply Now
                      </Link>
                    </div>
                  </div>

                  {/* Right: Image or Illustration */}
                  <div className="hidden md:flex justify-center items-center relative">
                    <div className="relative w-[480px] h-[380px] rounded-2xl overflow-hidden shadow-2xl group">
                      {/* Try to load image, fallback to illustration */}
                      {!imageError[slide.id] ? (
                        <Image
                          src={`/slides/hero-${idx + 1}.jpg`}
                          alt={slide.title}
                          fill
                          className="object-cover transition-transform duration-[8000ms] ease-linear group-hover:scale-110"
                          priority={idx === 0}
                          onError={() => setImageError(prev => ({ ...prev, [slide.id]: true }))}
                        />
                      ) : (
                        /* Beautiful SVG illustration fallback */
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #1e3a5f 100%)' }}>
                          <svg viewBox="0 0 480 380" className="w-full h-full">
                            {/* Sky */}
                            <rect x="0" y="0" width="480" height="200" fill="#1e3a5f" opacity="0.3" />
                            {/* Ground */}
                            <rect x="0" y="280" width="480" height="100" fill="#0f1f33" opacity="0.5" />
                            {/* School building */}
                            <rect x="140" y="100" width="200" height="180" rx="8" fill="#d4a843" opacity="0.15" />
                            <rect x="140" y="100" width="200" height="180" rx="8" fill="none" stroke="#d4a843" strokeWidth="2" opacity="0.3" />
                            {/* Roof */}
                            <polygon points="140,100 240,40 340,100" fill="#d4a843" opacity="0.2" />
                            <polygon points="140,100 240,40 340,100" fill="none" stroke="#d4a843" strokeWidth="2" opacity="0.4" />
                            {/* Windows */}
                            <rect x="165" y="130" width="35" height="45" rx="4" fill="#d4a843" opacity="0.25" />
                            <rect x="222" y="130" width="35" height="45" rx="4" fill="#d4a843" opacity="0.25" />
                            <rect x="280" y="130" width="35" height="45" rx="4" fill="#d4a843" opacity="0.25" />
                            {/* Door */}
                            <rect x="210" y="200" width="60" height="80" rx="4" fill="#d4a843" opacity="0.2" />
                            {/* Tree */}
                            <circle cx="80" cy="240" r="50" fill="#2a9d8f" opacity="0.15" />
                            <circle cx="400" cy="250" r="40" fill="#2a9d8f" opacity="0.15" />
                            {/* Playground slide */}
                            <rect x="360" y="200" width="8" height="80" rx="4" fill="#d4a843" opacity="0.2" />
                            <polygon points="360,200 400,240 360,240" fill="#d4a843" opacity="0.15" />
                            {/* Sun */}
                            <circle cx="420" cy="60" r="30" fill="#d4a843" opacity="0.15" />
                            {/* Clouds */}
                            <ellipse cx="100" cy="70" rx="40" ry="15" fill="white" opacity="0.08" />
                            <ellipse cx="350" cy="90" rx="35" ry="12" fill="white" opacity="0.08" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <School className="w-16 h-16 text-[#d4a843]/40 mx-auto mb-3" />
                              <p className="text-sm text-[#d4a843]/50 font-medium">BDJA Campus</p>
                              <p className="text-xs text-white/30 mt-1">Add images to public/slides/</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/40 via-transparent to-transparent" />
                      {/* Decorative frame */}
                      <div className="absolute inset-3 border border-[#d4a843]/20 rounded-xl pointer-events-none" />
                    </div>
                    {/* Floating badge */}
                    <div className="absolute -bottom-3 -left-3 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-float" style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}>
                      <GraduationCap className="w-4 h-4 text-white" />
                      <span className="text-xs font-bold text-white">CBC Curriculum</span>
                    </div>
                    {/* Stats floating card */}
                    <div className="absolute -top-3 -right-3 px-4 py-2 rounded-xl shadow-lg glass-dark flex items-center gap-2 animate-float" style={{ animationDelay: '1s' }}>
                      <Star className="w-4 h-4 text-[#d4a843]" />
                      <span className="text-xs font-bold text-white">Top Rated</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Navigation Arrows */}
            <button onClick={prevSlide} className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all z-20 border border-white/10" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button onClick={nextSlide} className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all z-20 border border-white/10" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
              <ChevronRight className="w-5 h-5 text-white" />
            </button>

            {/* Dots + Progress */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20 pb-2">
              <div className="flex gap-2">
                {slides.map((_, idx) => (
                  <button key={idx} onClick={() => goToSlide(idx)} className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'bg-[#d4a843] w-8' : 'bg-white/30 w-2 hover:bg-white/50'}`} />
                ))}
              </div>
              <div className="w-40 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div className="h-full rounded-full transition-all duration-100" style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg, #d4a843, #e8c97a)' }} />
              </div>
              {isPaused && <span className="text-[10px] text-white/40 flex items-center gap-1"><Pause className="w-2.5 h-2.5" /> Paused</span>}
            </div>
          </div>
        </div>
      </section>

      {/* ===== THREE COLUMN: Director | Notices | News ===== */}
      <section className="relative py-20 overflow-hidden" style={{ background: 'linear-gradient(180deg, #f5f0e8 0%, #ebe5d8 100%)' }}>
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%231e3a5f' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Director's Message */}
            <ScrollReveal delay={0}>
              <div className="relative rounded-2xl p-7 overflow-hidden card-hover" style={{ background: 'linear-gradient(145deg, #1e3a5f 0%, #0f1f33 100%)' }}>
                {/* Glow effect */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #d4a843 0%, transparent 70%)', filter: 'blur(40px)' }} />
                <h3 className="text-sm font-bold uppercase tracking-widest mb-5 flex items-center gap-2" style={{ color: '#d4a843' }}>
                  <Sparkles className="w-4 h-4" /> Director&apos;s Message
                </h3>
                <div className="space-y-4 relative">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}>
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 space-y-1.5 pt-1">
                      <div className="h-1 rounded w-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
                      <div className="h-1 rounded w-3/4" style={{ background: 'rgba(255,255,255,0.1)' }} />
                      <div className="h-1 rounded w-5/6" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    </div>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed italic">&ldquo;{director.message}&rdquo;</p>
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-xs text-white/40 italic">{director.director_name}</p>
                    <p className="text-xs font-semibold" style={{ color: '#d4a843' }}>{director.director_title}</p>
                  </div>
                  <Link href="/about" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 hover:scale-[1.02]" style={{ background: 'rgba(212,168,67,0.15)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.3)' }}>
                    Read More <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            {/* Notice Board */}
            <ScrollReveal delay={100}>
              <div className="relative rounded-2xl p-7 overflow-hidden card-hover" style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f8f5f0 100%)', border: '1px solid rgba(30,58,95,0.08)' }}>
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #2a9d8f 0%, transparent 70%)', filter: 'blur(30px)' }} />
                <div className="flex items-center justify-between mb-5 relative">
                  <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#1e3a5f' }}>
                    <FileText className="w-4 h-4 text-[#2a9d8f]" /> Notice Board
                  </h3>
                  <Link href="/notices" className="text-xs flex items-center gap-1 transition-colors hover:text-[#d4a843]" style={{ color: '#2d5a87' }}>
                    View All <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-3 relative">
                  {notices.map((notice, i) => (
                    <div key={notice.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0 group cursor-pointer" style={{ borderColor: 'rgba(30,58,95,0.06)' }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110" style={{ background: 'rgba(42,157,143,0.1)' }}>
                        <FileText className="w-4 h-4" style={{ color: '#2a9d8f' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate transition-colors group-hover:text-[#1e3a5f]" style={{ color: '#0f1f33' }}>{notice.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: getCategoryColor(notice.category || 'General') }}>{notice.category || 'General'}</span>
                          <span className="text-xs text-gray-400">{formatDate(notice.notice_date)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Latest News */}
            <ScrollReveal delay={200}>
              <div className="relative rounded-2xl p-7 overflow-hidden card-hover" style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f8f5f0 100%)', border: '1px solid rgba(30,58,95,0.08)' }}>
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #d4a843 0%, transparent 70%)', filter: 'blur(30px)' }} />
                <div className="flex items-center justify-between mb-5 relative">
                  <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#1e3a5f' }}>
                    <Sparkles className="w-4 h-4 text-[#d4a843]" /> Latest News
                  </h3>
                  <Link href="/news-events" className="text-xs flex items-center gap-1 transition-colors hover:text-[#d4a843]" style={{ color: '#2d5a87' }}>
                    View All <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-3 relative">
                  {news.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0 group cursor-pointer" style={{ borderColor: 'rgba(30,58,95,0.06)' }}>
                      <div className="w-16 h-12 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center transition-all" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)' }}>
                        <FileText className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2 transition-colors group-hover:text-[#1e3a5f]" style={{ color: '#0f1f33' }}>{item.title}</p>
                        <span className="text-xs text-gray-400">{formatDate(item.news_date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ===== OUR SCHOOLS — INFINITE MARQUEE ===== */}
      <section className="relative py-20 overflow-hidden" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0f1f33 50%, #0a1628 100%)' }}>
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] left-[10%] w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #d4a843 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-[20%] right-[10%] w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #2a9d8f 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(212,168,67,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.3) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }} />

        <div className="max-w-7xl mx-auto px-4 relative mb-12">
          <ScrollReveal>
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ background: 'rgba(212,168,67,0.15)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.3)' }}>
                <School className="w-3.5 h-3.5" /> Our Programs
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                Our Schools
              </h3>
              <p className="text-white/50 text-sm max-w-md mx-auto">Playgroup to Grade 6 — A journey of discovery, growth, and excellence for every child.</p>
            </div>
          </ScrollReveal>
        </div>

        {/* Marquee Row 1 — moves LEFT */}
        <div className="relative mb-6 overflow-hidden">
          <div className="flex animate-marquee-left" style={{ width: 'max-content' }}>
            {GRADES_DUP.map((grade, idx) => (
              <Link
                key={`r1-${grade.key}-${idx}`}
                href={`/academics/${grade.key}`}
                className="group flex-shrink-0 mx-3"
              >
                <div
                  className="relative w-[180px] h-[200px] rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all duration-500 hover:scale-105 card-glow"
                  style={{
                    background: 'linear-gradient(145deg, rgba(30,58,95,0.6) 0%, rgba(15,31,51,0.8) 100%)',
                    border: '1px solid rgba(212,168,67,0.15)',
                  }}
                >
                  {/* Glow orb on hover */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                    background: `radial-gradient(circle at 50% 50%, ${grade.color}20 0%, transparent 70%)`,
                  }} />
                  <div className="relative w-16 h-16 mb-4 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110" style={{
                    background: `linear-gradient(135deg, ${grade.color}30 0%, ${grade.color}15 100%)`,
                    border: `1px solid ${grade.color}40`,
                  }}>
                    <Image
                      src={`/grades/${grade.icon}`}
                      alt={grade.name}
                      width={40}
                      height={40}
                      className="object-contain w-10 h-10"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                  <p className="text-sm font-bold text-white group-hover:text-[#d4a843] transition-colors relative">{grade.name}</p>
                  <p className="text-[10px] text-white/30 mt-1 relative">Explore</p>
                  {/* Corner accent */}
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: grade.color }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Marquee Row 2 — moves RIGHT */}
        <div className="relative overflow-hidden">
          <div className="flex animate-marquee-right" style={{ width: 'max-content' }}>
            {[...GRADES_DUP].reverse().map((grade, idx) => (
              <Link
                key={`r2-${grade.key}-${idx}`}
                href={`/academics/${grade.key}`}
                className="group flex-shrink-0 mx-3"
              >
                <div
                  className="relative w-[180px] h-[200px] rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all duration-500 hover:scale-105 card-glow"
                  style={{
                    background: 'linear-gradient(145deg, rgba(30,58,95,0.6) 0%, rgba(15,31,51,0.8) 100%)',
                    border: '1px solid rgba(42,157,143,0.15)',
                  }}
                >
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                    background: `radial-gradient(circle at 50% 50%, ${grade.color}20 0%, transparent 70%)`,
                  }} />
                  <div className="relative w-16 h-16 mb-4 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110" style={{
                    background: `linear-gradient(135deg, ${grade.color}30 0%, ${grade.color}15 100%)`,
                    border: `1px solid ${grade.color}40`,
                  }}>
                    <Image
                      src={`/grades/${grade.icon}`}
                      alt={grade.name}
                      width={40}
                      height={40}
                      className="object-contain w-10 h-10"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                  <p className="text-sm font-bold text-white group-hover:text-[#2a9d8f] transition-colors relative">{grade.name}</p>
                  <p className="text-[10px] text-white/30 mt-1 relative">Explore</p>
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: grade.color }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, #0a1628 0%, transparent 100%)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(270deg, #0a1628 0%, transparent 100%)' }} />
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="relative py-16 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #1e3a5f 100%)' }}>
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{
              left: `${10 + i * 12}%`,
              top: `${15 + (i % 4) * 20}%`,
              background: i % 2 === 0 ? '#d4a843' : '#2a9d8f',
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2 + i * 0.3}s`,
              opacity: 0.4,
            }} />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <ScrollReveal key={stat.id} delay={i * 120}>
                <div className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 hover:bg-white/5">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.2)' }}>
                    <stat.icon className="w-7 h-7 text-[#d4a843]" />
                  </div>
                  <div>
                    <p className="text-3xl md:text-4xl font-bold text-white">
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} duration={2500} />
                    </p>
                    <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MISSION & VISION ===== */}
      <section className="relative py-24 overflow-hidden" style={{ background: 'linear-gradient(180deg, #f5f0e8 0%, #ebe5d8 100%)' }}>
        {/* Decorative blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #1e3a5f 0%, transparent 70%)', filter: 'blur(60px)' }} />

        <div className="max-w-5xl mx-auto px-4 relative">
          <ScrollReveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ background: 'rgba(30,58,95,0.08)', color: '#1e3a5f', border: '1px solid rgba(30,58,95,0.15)' }}>
                <Lightbulb className="w-3.5 h-3.5" /> Our Foundation
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-3" style={{ color: '#0a1628', fontFamily: "'Playfair Display', serif" }}>
                Mission & <span style={{ color: '#d4a843' }}>Vision</span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6">
            <ScrollReveal delay={100} direction="left">
              <div className="relative rounded-2xl p-8 overflow-hidden card-hover" style={{
                background: 'linear-gradient(145deg, #1e3a5f 0%, #0f1f33 100%)',
                border: '1px solid rgba(212,168,67,0.15)',
              }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #d4a843 0%, transparent 70%)', filter: 'blur(40px)' }} />
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.25)' }}>
                  <GraduationCap className="w-7 h-7 text-[#d4a843]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Mission</h3>
                <p className="text-white/60 leading-relaxed text-sm">
                  To encourage children in learning opportunity through prayer, commitment and hard work. We believe every child deserves a nurturing environment to discover their potential.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200} direction="right">
              <div className="relative rounded-2xl p-8 overflow-hidden card-hover" style={{
                background: 'linear-gradient(145deg, #ffffff 0%, #f8f5f0 100%)',
                border: '1px solid rgba(30,58,95,0.08)',
              }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #2a9d8f 0%, transparent 70%)', filter: 'blur(40px)' }} />
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(42,157,143,0.1)', border: '1px solid rgba(42,157,143,0.2)' }}>
                  <Sparkles className="w-7 h-7 text-[#2a9d8f]" />
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#0a1628', fontFamily: "'Playfair Display', serif" }}>Vision</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  To empower children to make a difference in their lives, the life of their community and the wider world. We shape tomorrow&apos;s leaders today.
                </p>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={300}>
            <div className="mt-10 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full shadow-sm" style={{ background: 'white', border: '1px solid rgba(30,58,95,0.08)' }}>
                <BookOpen className="w-5 h-5 text-[#1e3a5f]" />
                <span className="text-sm font-medium" style={{ color: '#0f1f33' }}>
                  CBC Curriculum &middot; Playgroup, PP1, PP2, Grade 1&ndash;6
                </span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <section className="relative py-20 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1e3a5f 50%, #0f1f33 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #d4a843 0%, transparent 70%)', filter: 'blur(80px)' }} />
          <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #2a9d8f 0%, transparent 70%)', filter: 'blur(80px)' }} />
        </div>

        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <ScrollReveal>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Begin Your Child&apos;s <span style={{ color: '#d4a843' }}>Journey</span>
            </h2>
            <p className="text-white/50 text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Give your child the gift of quality education. Join the BDJA family and watch them grow into confident, curious, and compassionate learners.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/admissions"
                className="inline-flex items-center gap-2 px-8 py-4 text-white font-bold rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}
              >
                Enroll Today <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 font-bold rounded-xl border transition-all duration-300 hover:scale-[1.03]"
                style={{ borderColor: 'rgba(212,168,67,0.4)', color: '#d4a843' }}
              >
                Contact Us
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PublicLayout>
  );
}
