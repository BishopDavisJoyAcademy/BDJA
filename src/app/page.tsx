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
  Sparkles
} from "lucide-react";

// Fallback data
const FALLBACK_SLIDES = [
  {
    id: "1",
    title: "A Happy Beginning",
    subtitle: "for a Bright Future",
    description: "Providing a safe, nurturing and stimulating environment where children grow, learn and shine.",
    button_text: "Discover More",
    button_link: "/about",
    image: "/slides/hero-1.jpg",
  },
  {
    id: "2",
    title: "Excellence in Education",
    subtitle: "CBC Curriculum",
    description: "Empowering children to make a difference in their lives, their community and the wider world.",
    button_text: "Learn More",
    button_link: "/academics",
    image: "/slides/hero-2.jpg",
  },
  {
    id: "3",
    title: "Nurturing Young Minds",
    subtitle: "Building Bright Futures",
    description: "Encouraging children in learning opportunity through prayer, commitment and hard work.",
    button_text: "Admissions",
    button_link: "/admissions",
    image: "/slides/hero-3.jpg",
  },
];

const FALLBACK_NOTICES = [
  { id: "1", title: "School Term II Resumes", notice_date: "2024-05-20" },
  { id: "2", title: "Parent-Teacher Meeting", notice_date: "2024-05-15" },
  { id: "3", title: "Mid Term Break", notice_date: "2024-05-10" },
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

const FALLBACK_STATS = [
  { id: "1", label: "Happy Learners", value: 500, suffix: "+", icon: "users" },
  { id: "2", label: "Dedicated Staff", value: 40, suffix: "+", icon: "user" },
  { id: "3", label: "Years of Excellence", value: 10, suffix: "+", icon: "building" },
  { id: "4", label: "Holistic Learning", value: 100, suffix: "%", icon: "book" },
];

const GRADES = [
  { key: "playgroup", name: "Playgroup", icon: "playgroup-icon.png" },
  { key: "pp1", name: "Pre-Primary", icon: "pp1-icon.png" },
  { key: "pp2", name: "Pre-Primary 2", icon: "pp2-icon.png" },
  { key: "grade1", name: "Grade 1", icon: "grade1-icon.png" },
  { key: "grade2", name: "Grade 2", icon: "grade2-icon.png" },
  { key: "grade3", name: "Grade 3", icon: "grade3-icon.png" },
  { key: "grade4", name: "Grade 4", icon: "grade4-icon.png" },
  { key: "grade5", name: "Grade 5", icon: "grade5-icon.png" },
  { key: "grade6", name: "Grade 6", icon: "grade6-icon.png" },
];

export default function HomePage() {
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [notices, setNotices] = useState(FALLBACK_NOTICES);
  const [news, setNews] = useState(FALLBACK_NEWS);
  const [director, setDirector] = useState(FALLBACK_DIRECTOR);
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});
  const heroRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  // Load CMS data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [s, n, ns, dm, st] = await Promise.all([
          supabase.from("homepage_slides").select("*").eq("is_active", true).order("display_order"),
          supabase.from("homepage_notices").select("*").eq("is_active", true).order("notice_date", { ascending: false }).limit(5),
          supabase.from("homepage_news").select("*").eq("is_active", true).order("news_date", { ascending: false }).limit(5),
          supabase.from("homepage_director_message").select("*").eq("is_active", true).maybeSingle(),
          supabase.from("homepage_stats").select("*").eq("is_active", true).order("display_order"),
        ]);
        if (s?.data?.length) setSlides(s.data.map((d: any) => ({ ...d, image: d.image_url || `/slides/hero-${d.display_order || 1}.jpg` })));
        if (n?.data?.length) setNotices(n.data);
        if (ns?.data?.length) setNews(ns.data);
        if (dm?.data) setDirector(dm.data);
        if (st?.data?.length) setStats(st.data.map((d: any) => ({ ...d, value: parseInt(d.value) || 0, suffix: d.suffix || "" })));
      } catch {
        // Silently use fallback
      }
    };
    loadData();
  }, []);

  // Auto-slide with progress bar
  useEffect(() => {
    if (isPaused) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const duration = 5000;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const pct = Math.min(elapsed / duration, 1);
      setProgress(pct);
      progressRef.current = pct;

      if (pct >= 1) {
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
    setTimeout(() => setIsAnimating(false), 700);
  }, [isAnimating]);

  const nextSlide = () => goToSlide((currentSlide + 1) % slides.length);
  const prevSlide = () => goToSlide((currentSlide - 1 + slides.length) % slides.length);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return dateStr; }
  };

  const getStatIcon = (iconName: string) => {
    switch (iconName) {
      case "users": return <Users className="w-8 h-8 text-bdja-primary" />;
      case "user": return <Users className="w-8 h-8 text-bdja-primary" />;
      case "building": return <Building className="w-8 h-8 text-bdja-primary" />;
      case "book": return <BookOpen className="w-8 h-8 text-bdja-primary" />;
      default: return <Users className="w-8 h-8 text-bdja-primary" />;
    }
  };

  return (
    <PublicLayout>
      {/* ===== HERO CAROUSEL ===== */}
      <section
        ref={heroRef}
        className="relative overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#f0f4f8] via-[#e8f0f8] to-[#f5f0e8]" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#1e3a5f]/10 rounded-full blur-[100px] animate-pulse-soft" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#c9a227]/10 rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: "1s" }} />
          <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] bg-[#2d5a87]/10 rounded-full blur-[80px] animate-pulse-soft" style={{ animationDelay: "2s" }} />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="relative h-[480px] md:h-[580px]">
            {/* Slides */}
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`absolute inset-0 flex items-center transition-all duration-700 ease-out ${
                  idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                <div className="grid md:grid-cols-2 gap-8 items-center w-full px-6 md:px-12 h-full">
                  {/* Left: Text */}
                  <div className="space-y-5 z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-bdja-primary/10 text-bdja-primary rounded-full text-xs font-medium">
                      <Sparkles className="w-3 h-3" /> Welcome to BDJA
                    </div>
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-bdja-primary leading-tight">
                      {slide.title}
                      <span className="block text-bdja-accent mt-1">{slide.subtitle}</span>
                    </h2>
                    <p className="text-gray-600 text-sm md:text-base max-w-md leading-relaxed">
                      {slide.description}
                    </p>
                    <div className="flex items-center gap-3">
                      <Link
                        href={slide.button_link || "/about"}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-bdja-primary text-white font-medium rounded-xl hover:bg-bdja-accent transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-bdja-primary/20"
                      >
                        {slide.button_text || "Discover More"}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <Link
                        href="/admissions"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-bdja-primary font-medium rounded-xl border-2 border-bdja-primary/20 hover:border-bdja-primary hover:bg-bdja-primary/5 transition-all duration-300"
                      >
                        Apply Now
                      </Link>
                    </div>
                  </div>

                  {/* Right: Image */}
                  <div className="hidden md:flex justify-center items-center h-full relative">
                    <div className="relative w-[500px] h-[400px] rounded-2xl overflow-hidden shadow-2xl shadow-bdja-primary/10 group">
                      <Image
                        src={slide.image}
                        alt={slide.title}
                        fill
                        className="object-cover transition-transform duration-[8000ms] ease-linear group-hover:scale-110"
                        priority={idx === 0}
                        onLoad={() => setImagesLoaded(prev => ({ ...prev, [slide.id]: true }))}
                      />
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-bdja-primary/30 via-transparent to-transparent" />
                      {/* Decorative frame */}
                      <div className="absolute inset-3 border-2 border-white/20 rounded-xl pointer-events-none" />
                    </div>
                    {/* Floating badge */}
                    <div className="absolute -bottom-2 -left-2 bg-white rounded-xl p-3 shadow-lg flex items-center gap-2 animate-bounce" style={{ animationDuration: "3s" }}>
                      <GraduationCap className="w-5 h-5 text-bdja-secondary" />
                      <span className="text-xs font-semibold text-bdja-dark">CBC Curriculum</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all z-20 border border-gray-100"
            >
              <ChevronLeft className="w-5 h-5 text-bdja-primary" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all z-20 border border-gray-100"
            >
              <ChevronRight className="w-5 h-5 text-bdja-primary" />
            </button>

            {/* Dot Indicators + Progress */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
              <div className="flex gap-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToSlide(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      idx === currentSlide ? "bg-bdja-primary w-8" : "bg-gray-300 w-2.5 hover:bg-gray-400"
                    }`}
                  />
                ))}
              </div>
              {/* Progress bar */}
              <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-bdja-secondary rounded-full transition-all duration-100"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              {/* Pause indicator */}
              {isPaused && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Pause className="w-3 h-3" /> Paused
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== THREE COLUMN: Director, Notices, News ===== */}
      <section className="py-16 bg-[#faf9f6]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Director's Message */}
            <ScrollReveal delay={0}>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <h3 className="text-sm font-bold text-bdja-primary uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-bdja-secondary" /> Director&apos;s Message
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-bdja-primary to-bdja-accent rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center shadow-md">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 space-y-1.5 pt-1">
                      <div className="h-1.5 bg-gray-100 rounded w-full" />
                      <div className="h-1.5 bg-gray-100 rounded w-3/4" />
                      <div className="h-1.5 bg-gray-100 rounded w-5/6" />
                      <div className="h-1.5 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed italic">&ldquo;{director.message}&rdquo;</p>
                  <div className="pt-3 border-t border-gray-50">
                    <p className="text-xs italic text-gray-400">{director.director_name}</p>
                    <p className="text-xs font-medium text-bdja-primary">{director.director_title}</p>
                  </div>
                  <Link href="/about" className="inline-flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-bdja-primary hover:text-white hover:border-bdja-primary transition-all duration-300">
                    Read More <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            {/* Notice Board */}
            <ScrollReveal delay={100}>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-bdja-primary uppercase tracking-wide flex items-center gap-2">
                    <FileText className="w-4 h-4 text-bdja-secondary" /> Notice Board
                  </h3>
                  <Link href="/notices" className="text-xs text-bdja-accent hover:text-bdja-primary flex items-center gap-1 transition-colors">
                    View All <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {notices.map((notice, i) => (
                    <ScrollReveal key={notice.id} delay={i * 60}>
                      <div className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0 group cursor-pointer">
                        <div className="w-8 h-8 bg-bdja-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-bdja-primary group-hover:text-white transition-colors">
                          <FileText className="w-4 h-4 text-bdja-primary group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-bdja-dark truncate group-hover:text-bdja-primary transition-colors">{notice.title}</p>
                          <p className="text-xs text-gray-400">{formatDate(notice.notice_date)}</p>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Latest News */}
            <ScrollReveal delay={200}>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-bdja-primary uppercase tracking-wide flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-bdja-secondary" /> Latest News
                  </h3>
                  <Link href="/news-events" className="text-xs text-bdja-accent hover:text-bdja-primary flex items-center gap-1 transition-colors">
                    View All <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {news.map((item, i) => (
                    <ScrollReveal key={item.id} delay={i * 60}>
                      <div className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0 group cursor-pointer">
                        <div className="w-16 h-12 bg-gradient-to-br from-bdja-light to-gray-100 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center group-hover:from-bdja-primary group-hover:to-bdja-accent transition-all">
                          <FileText className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-bdja-dark line-clamp-2 group-hover:text-bdja-primary transition-colors">{item.title}</p>
                          <p className="text-xs text-gray-400">{formatDate(item.news_date)}</p>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ===== GRADES WE OFFER ===== */}
      <section className="py-16 bg-white relative overflow-hidden">
        {/* Decorative background blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-bdja-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-bdja-secondary/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 relative">
          <ScrollReveal>
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-bold text-bdja-primary">Our Schools</h3>
                <p className="text-sm text-gray-500 mt-1">Playgroup to Grade 6</p>
              </div>
              <Link href="/academics" className="text-sm text-bdja-accent hover:text-bdja-primary flex items-center gap-1 transition-colors font-medium">
                View All Levels <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-4">
            {GRADES.map((grade, idx) => (
              <ScrollReveal key={grade.key} delay={idx * 60} direction="up">
                <Link
                  href={`/academics/${grade.key}`}
                  className="group bg-white border border-gray-100 rounded-2xl p-4 text-center hover:shadow-xl hover:border-bdja-primary/30 transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center group-hover:from-bdja-primary/10 group-hover:to-bdja-accent/10 transition-all overflow-hidden">
                    <Image
                      src={`/grades/${grade.icon}`}
                      alt={grade.name}
                      width={48}
                      height={48}
                      className="object-contain w-12 h-12 group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-xs font-semibold text-bdja-dark group-hover:text-bdja-primary transition-colors">{grade.name}</p>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="py-14 bg-gradient-to-r from-bdja-primary via-bdja-accent to-[#1e3a5f] text-white relative overflow-hidden">
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse-soft"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${2 + i * 0.5}s`,
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <ScrollReveal key={stat.id} delay={i * 100}>
                <div className="flex items-center gap-4 px-4 py-2">
                  <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                    {getStatIcon(stat.icon)}
                  </div>
                  <div>
                    <p className="text-2xl md:text-3xl font-bold">
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} duration={2500} />
                    </p>
                    <p className="text-xs text-white/70">{stat.label}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MISSION & VISION BANNER ===== */}
      <section className="py-20 bg-[#faf9f6] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-bdja-primary/5 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto px-4 text-center space-y-8 relative">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-bdja-primary/10 text-bdja-primary rounded-full text-sm font-medium mb-2">
              <Sparkles className="w-4 h-4" /> Our Foundation
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-bdja-primary">Our Mission & Vision</h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6">
            <ScrollReveal delay={100} direction="left">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-bdja-primary/20 transition-all duration-300 text-left">
                <div className="w-12 h-12 bg-bdja-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6 text-bdja-primary" />
                </div>
                <h3 className="text-xl font-bold text-bdja-dark mb-3">Mission</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  To encourage children in learning opportunity through prayer, commitment and hard work.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200} direction="right">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-bdja-secondary/30 transition-all duration-300 text-left">
                <div className="w-12 h-12 bg-bdja-secondary/10 rounded-xl flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-bdja-secondary" />
                </div>
                <h3 className="text-xl font-bold text-bdja-dark mb-3">Vision</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  To empower children to make a difference in their lives, the life of their community and the wider world.
                </p>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={300}>
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-sm border border-gray-100">
              <BookOpen className="w-5 h-5 text-bdja-primary" />
              <span className="text-sm font-medium text-bdja-dark">
                CBC Curriculum &middot; Playgroup, PP1, PP2, Grade 1&ndash;6
              </span>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PublicLayout>
  );
}
