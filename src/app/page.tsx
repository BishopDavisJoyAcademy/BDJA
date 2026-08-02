"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { PublicLayout } from "@/components/layout/PublicLayout";
import {
  ChevronLeft, ChevronRight, FileText, GraduationCap,
  Users, BookOpen, Building, ArrowRight
} from "lucide-react";

// Fallback data that matches the blueprint exactly
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
  { id: "1", label: "Happy Learners", value: "500+", icon: "users" },
  { id: "2", label: "Dedicated Staff", value: "40+", icon: "user" },
  { id: "3", label: "Years of Excellence", value: "10+", icon: "building" },
  { id: "4", label: "Holistic Learning Approach", value: "", icon: "book" },
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

  // Load from Supabase if available (enhancement, not required)
  useEffect(() => {
    const loadData = async () => {
      try {
        const [{ data: s }, { data: n }, { data: ns }, { data: dm }, { data: st }] = await Promise.all([
          supabase.from("homepage_carousel").select("*").eq("is_active", true).order("display_order"),
          supabase.from("homepage_notices").select("*").eq("is_active", true).order("notice_date", { ascending: false }).limit(5),
          supabase.from("homepage_news").select("*").eq("is_active", true).order("news_date", { ascending: false }).limit(3),
          supabase.from("homepage_director_message").select("*").eq("is_active", true).maybeSingle(),
          supabase.from("homepage_stats").select("*").eq("is_active", true).order("display_order"),
        ]);
        if (s?.length) setSlides(s);
        if (n?.length) setNotices(n);
        if (ns?.length) setNews(ns);
        if (dm) setDirector(dm);
        if (st?.length) setStats(st);
      } catch {
        // Silently use fallback data
      }
    };
    loadData();
  }, []);

  // Auto-slide
  useEffect(() => {
    const timer = setInterval(() => {
      goToSlide((currentSlide + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [currentSlide, slides.length]);

  const goToSlide = useCallback((index: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide(index);
    setTimeout(() => setIsAnimating(false), 600);
  }, [isAnimating]);

  const nextSlide = () => goToSlide((currentSlide + 1) % slides.length);
  const prevSlide = () => goToSlide((currentSlide - 1 + slides.length) % slides.length);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const getStatIcon = (iconName: string) => {
    switch (iconName) {
      case "users": return <Users className="w-8 h-8 text-[#1e3a5f]" />;
      case "user": return <Users className="w-8 h-8 text-[#1e3a5f]" />;
      case "building": return <Building className="w-8 h-8 text-[#1e3a5f]" />;
      case "book": return <BookOpen className="w-8 h-8 text-[#1e3a5f]" />;
      default: return <Users className="w-8 h-8 text-[#1e3a5f]" />;
    }
  };

  return (
    <PublicLayout>
      {/* Hero Carousel - Matches Blueprint */}
      <section className="relative bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative h-[420px] md:h-[520px]">
            {/* Slides */}
            <div className="absolute inset-0 flex">
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 flex items-center transition-all duration-700 ease-out ${
                    idx === currentSlide ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
                  }`}
                >
                  <div className="grid md:grid-cols-2 gap-8 items-center w-full px-6 md:px-12 h-full">
                    {/* Left: Text */}
                    <div className="space-y-5 z-10">
                      <h2 className="text-3xl md:text-5xl font-bold text-[#1e3a5f] leading-tight">
                        {slide.title}
                        <span className="block text-[#2d5a87]">{slide.subtitle}</span>
                      </h2>
                      <p className="text-gray-600 text-sm md:text-base max-w-md leading-relaxed">
                        {slide.description}
                      </p>
                      <Link
                        href={slide.button_link || "/about"}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-[#1e3a5f] text-[#1e3a5f] font-medium rounded-lg hover:bg-[#1e3a5f] hover:text-white transition-all duration-300"
                      >
                        {slide.button_text || "Discover More"}
                      </Link>
                    </div>
                    {/* Right: School Illustration Placeholder */}
                    <div className="hidden md:flex justify-center items-center h-full">
                      <div className="relative w-[480px] h-[360px] bg-gradient-to-br from-[#e8f0f8] to-[#d4e4f4] rounded-2xl flex items-center justify-center overflow-hidden shadow-lg">
                        {/* Decorative school illustration placeholder */}
                        <div className="absolute inset-0 opacity-20">
                          <svg viewBox="0 0 480 360" className="w-full h-full">
                            <rect x="120" y="80" width="240" height="180" rx="8" fill="#1e3a5f" opacity="0.3" />
                            <polygon points="120,80 240,20 360,80" fill="#1e3a5f" opacity="0.2" />
                            <rect x="150" y="140" width="40" height="50" rx="4" fill="#1e3a5f" opacity="0.25" />
                            <rect x="210" y="140" width="40" height="50" rx="4" fill="#1e3a5f" opacity="0.25" />
                            <rect x="270" y="140" width="40" height="50" rx="4" fill="#1e3a5f" opacity="0.25" />
                            <rect x="200" y="210" width="80" height="50" rx="4" fill="#c9a227" opacity="0.3" />
                            <circle cx="80" cy="280" r="30" fill="#4a7c59" opacity="0.2" />
                            <circle cx="400" cy="290" r="25" fill="#4a7c59" opacity="0.2" />
                            <rect x="320" y="200" width="60" height="80" rx="30" fill="#1e3a5f" opacity="0.15" />
                          </svg>
                        </div>
                        <div className="relative z-10 text-center">
                          <GraduationCap className="w-20 h-20 text-[#1e3a5f]/30 mx-auto mb-3" />
                          <p className="text-sm text-[#1e3a5f]/50 font-medium">School Campus</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all z-20 border border-gray-200"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all z-20 border border-gray-200"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>

            {/* Dot Indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    idx === currentSlide ? "bg-[#1e3a5f] w-6" : "bg-gray-400 hover:bg-gray-500"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Three Column Section: Director, Notices, News */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Director's Message */}
            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300">
              <h3 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide mb-4">Director&apos;s Message</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1 space-y-1.5 pt-1">
                    <div className="h-1.5 bg-gray-200 rounded w-full" />
                    <div className="h-1.5 bg-gray-200 rounded w-3/4" />
                    <div className="h-1.5 bg-gray-200 rounded w-5/6" />
                    <div className="h-1.5 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{director.message}</p>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs italic text-gray-500">{director.director_name}</p>
                  <p className="text-xs font-medium text-[#1e3a5f]">{director.director_title}</p>
                </div>
                <Link href="/about" className="inline-block px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Read More
                </Link>
              </div>
            </div>

            {/* Notice Board */}
            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide">Notice Board</h3>
                <Link href="/notices" className="text-xs text-[#2d5a87] hover:underline flex items-center gap-1">
                  View All Notices <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {notices.map((notice) => (
                  <div key={notice.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1e3a5f] truncate">{notice.title}</p>
                      <p className="text-xs text-gray-400">{formatDate(notice.notice_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Latest News */}
            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide">Latest News</h3>
                <Link href="/news-events" className="text-xs text-[#2d5a87] hover:underline flex items-center gap-1">
                  View All News <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {news.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-16 h-12 bg-gray-100 rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1e3a5f] line-clamp-2">{item.title}</p>
                      <p className="text-xs text-gray-400">{formatDate(item.news_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grades We Offer */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-[#1e3a5f]">GRADES WE OFFER</h3>
              <p className="text-sm text-gray-500">Playgroup to Grade 6</p>
            </div>
            <Link href="/academics" className="text-sm text-[#2d5a87] hover:underline flex items-center gap-1">
              View All Levels <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
            {GRADES.map((grade, idx) => (
              <Link
                key={grade.key}
                href={`/academics/${grade.key}`}
                className="group bg-white border border-gray-200 rounded-xl p-3 text-center hover:shadow-lg hover:border-[#1e3a5f]/30 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="w-14 h-14 mx-auto mb-2 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-[#1e3a5f]/5 transition-colors overflow-hidden">
                  <Image
                    src={`/grades/${grade.icon}`}
                    alt={grade.name}
                    width={48}
                    height={48}
                    className="object-contain w-12 h-12"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5"/></svg>`;
                    }}
                  />
                </div>
                <p className="text-xs font-medium text-[#1e3a5f]">{grade.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-10 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-gray-100">
            {stats.map((stat) => (
              <div key={stat.id} className="flex items-center gap-4 px-4 first:pl-0">
                {getStatIcon(stat.icon)}
                <div>
                  <p className="text-xl font-bold text-[#1e3a5f]">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Objective Banner */}
      <section className="py-16 bg-[#1e3a5f] text-white">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold">Our Mission & Vision</h2>
          <div className="space-y-4">
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              <strong className="text-white">Mission:</strong> To encourage children in learning opportunity.
            </p>
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              <strong className="text-white">Objective:</strong> To empower children to make a difference in their lives, the life of their community and the wider world.
            </p>
          </div>
          <p className="text-[#c9a227] font-medium text-sm">
            Curriculum: CBC (Competency Based Curriculum) &middot; Grades: Playgroup, PP1, PP2, Grade 1 through Grade 6
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
