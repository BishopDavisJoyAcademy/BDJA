"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import {
  Mail, BookOpen, GraduationCap, Users, Library, HelpCircle, Download,
  ChevronLeft, ChevronRight, MapPin, Phone, Mail as MailIcon, Globe,
  Facebook, Twitter, Instagram, Youtube, Search, Menu, X, FileText,
  CalendarDays, ArrowRight
} from "lucide-react";

interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string | null;
  button_text: string;
  button_link: string;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  notice_date: string;
  icon_type: string;
}

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  news_date: string;
}

interface DirectorMessage {
  id: string;
  director_name: string;
  director_title: string;
  message: string;
  director_photo_url: string | null;
}

interface Stat {
  id: string;
  label: string;
  value: string;
  icon_name: string;
}

interface GradeLevel {
  grade_key: string;
  display_name: string;
  icon_filename: string;
  description: string;
}

interface QuickLink {
  label: string;
  url: string;
  icon_name: string;
  target_audience: string;
}

interface FooterLink {
  section: string;
  label: string;
  url: string;
}

interface SocialLink {
  platform: string;
  url: string;
}

const iconMap: Record<string, React.ElementType> = {
  mail: Mail, "book-open": BookOpen, "graduation-cap": GraduationCap,
  users: Users, library: Library, "help-circle": HelpCircle,
  download: Download, "file-text": FileText, "calendar-days": CalendarDays,
  user: Users, building: BookOpen, "arrow-right": ArrowRight,
};

const socialIconMap: Record<string, React.ElementType> = {
  facebook: Facebook, twitter: Twitter, instagram: Instagram, youtube: Youtube,
};

export default function HomePage() {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [directorMsg, setDirectorMsg] = useState<DirectorMessage | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomepageData();
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const loadHomepageData = async () => {
    setLoading(true);
    try {
      const [
        { data: s }, { data: n }, { data: ns }, { data: dm },
        { data: st }, { data: gr }, { data: ql }, { data: fl }, { data: sl }
      ] = await Promise.all([
        supabase.from("homepage_carousel").select("*").eq("is_active", true).order("display_order"),
        supabase.from("homepage_notices").select("*").eq("is_active", true).order("is_pinned", { ascending: false }).order("notice_date", { ascending: false }).limit(5),
        supabase.from("homepage_news").select("*").eq("is_active", true).order("news_date", { ascending: false }).limit(3),
        supabase.from("homepage_director_message").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("homepage_stats").select("*").eq("is_active", true).order("display_order"),
        supabase.from("homepage_grade_levels").select("*").eq("is_active", true).order("display_order"),
        supabase.from("homepage_quick_links").select("*").eq("is_active", true).order("display_order"),
        supabase.from("homepage_footer_links").select("*").eq("is_active", true).order("section").order("display_order"),
        supabase.from("homepage_social_links").select("*").eq("is_active", true).order("display_order"),
      ]);
      setSlides(s || []);
      setNotices(n || []);
      setNews(ns || []);
      setDirectorMsg(dm || null);
      setStats(st || []);
      setGrades(gr || []);
      setQuickLinks(ql || []);
      setFooterLinks(fl || []);
      setSocialLinks(sl || []);
    } catch (e) {
      console.error("Homepage load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % Math.max(slides.length, 1));
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + Math.max(slides.length, 1)) % Math.max(slides.length, 1));

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Academics", href: "/academics" },
    { label: "Admissions", href: "/admissions" },
    { label: "Students", href: "/students" },
    { label: "News & Events", href: "/news-events" },
    { label: "Contact Us", href: "/contact" },
  ];

  const groupedFooter = footerLinks.reduce((acc, link) => {
    if (!acc[link.section]) acc[link.section] = [];
    acc[link.section].push(link);
    return acc;
  }, {} as Record<string, FooterLink[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-bdja-dark">
      {/* Top Bar */}
      <div className="bg-bdja-primary text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-4">
            {quickLinks.map((ql) => {
              const Icon = iconMap[ql.icon_name] || ArrowRight;
              return (
                <a key={ql.label} href={ql.url} className="flex items-center gap-1.5 hover:text-bdja-secondary transition-colors">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{ql.label}</span>
                </a>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <a href="/login?portal=student" className="hover:text-bdja-secondary transition-colors">Student Portal</a>
            <span className="text-white/30">|</span>
            <a href="/login?portal=staff" className="hover:text-bdja-secondary transition-colors">Staff Portal</a>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-bdja-primary rounded-lg flex items-center justify-center">
              <Image src="/logo.png" alt="BDJA Logo" width={40} height={40} className="object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-bdja-dark leading-tight">BISHOP DAVIS JOY ACADEMY</h1>
              <p className="text-xs text-gray-500">Nurturing Young Minds, Building Bright Futures</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-sm font-medium text-gray-700 hover:text-bdja-primary transition-colors">
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
            <div className="px-4 py-3 space-y-2">
              {navLinks.map((link) => (
                <Link key={link.label} href={link.href} className="block py-2 text-sm font-medium text-gray-700 hover:text-bdja-primary" onClick={() => setMobileMenuOpen(false)}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Hero Carousel */}
      <section className="relative bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative h-[400px] md:h-[500px] flex items-center">
            {slides.length > 0 ? (
              <>
                <div className="absolute inset-0 flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                  {slides.map((slide) => (
                    <div key={slide.id} className="min-w-full h-full flex items-center">
                      <div className="grid md:grid-cols-2 gap-8 items-center w-full px-6 md:px-12">
                        <div className="space-y-5">
                          <h2 className="text-3xl md:text-5xl font-bold text-bdja-dark leading-tight">
                            {slide.title}
                            {slide.subtitle && <span className="block text-bdja-primary">{slide.subtitle}</span>}
                          </h2>
                          <p className="text-gray-600 text-sm md:text-base max-w-md">{slide.description}</p>
                          <Link href={slide.button_link || "/about"} className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-bdja-dark text-bdja-dark font-medium rounded-lg hover:bg-bdja-dark hover:text-white transition-all">
                            {slide.button_text || "Discover More"}
                          </Link>
                        </div>
                        <div className="hidden md:flex justify-center">
                          {slide.image_url ? (
                            <Image src={slide.image_url} alt={slide.title} width={500} height={350} className="rounded-2xl shadow-lg object-cover" />
                          ) : (
                            <div className="w-[400px] h-[280px] bg-bdja-primary/10 rounded-2xl flex items-center justify-center">
                              <GraduationCap className="w-24 h-24 text-bdja-primary/30" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {slides.length > 1 && (
                  <>
                    <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors z-10">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors z-10">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                      {slides.map((_, idx) => (
                        <button key={idx} onClick={() => setCurrentSlide(idx)} className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentSlide ? "bg-bdja-primary w-6" : "bg-gray-300"}`} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <h2 className="text-4xl font-bold text-bdja-dark">A Happy Beginning<br /><span className="text-bdja-primary">for a Bright Future</span></h2>
                  <p className="text-gray-600 max-w-md mx-auto">Providing a safe, nurturing and stimulating environment where children grow, learn and shine.</p>
                  <Link href="/about" className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-bdja-dark text-bdja-dark font-medium rounded-lg hover:bg-bdja-dark hover:text-white transition-all">
                    Discover More
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Three Column Section: Director, Notices, News */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Director's Message */}
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="text-sm font-bold text-bdja-dark uppercase tracking-wide mb-4">Director&apos;s Message</h3>
              {directorMsg ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                      {directorMsg.director_photo_url ? (
                        <Image src={directorMsg.director_photo_url} alt={directorMsg.director_name} width={64} height={64} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-bdja-primary/10">
                          <Users className="w-8 h-8 text-bdja-primary/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="h-1 bg-gray-200 rounded w-full" />
                      <div className="h-1 bg-gray-200 rounded w-3/4" />
                      <div className="h-1 bg-gray-200 rounded w-5/6" />
                      <div className="h-1 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{directorMsg.message}</p>
                  <div className="pt-2">
                    <p className="text-xs italic text-gray-500">{directorMsg.director_name}</p>
                    <p className="text-xs font-medium text-bdja-dark">{directorMsg.director_title}</p>
                  </div>
                  <Link href="/about" className="inline-block px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    Read More
                  </Link>
                </div>
              ) : (
                <div className="text-sm text-gray-400">No director message available.</div>
              )}
            </div>

            {/* Notice Board */}
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-bdja-dark uppercase tracking-wide">Notice Board</h3>
                <Link href="/notices" className="text-xs text-bdja-primary hover:underline">View All Notices</Link>
              </div>
              <div className="space-y-4">
                {notices.length > 0 ? notices.map((notice) => (
                  <div key={notice.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-bdja-dark truncate">{notice.title}</p>
                      <p className="text-xs text-gray-400">{new Date(notice.notice_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-400">No notices at this time.</p>
                )}
              </div>
            </div>

            {/* Latest News */}
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-bdja-dark uppercase tracking-wide">Latest News</h3>
                <Link href="/news-events" className="text-xs text-bdja-primary hover:underline">View All News</Link>
              </div>
              <div className="space-y-4">
                {news.length > 0 ? news.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                    <div className="w-16 h-12 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.title} width={64} height={48} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <FileText className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-bdja-dark line-clamp-2">{item.title}</p>
                      <p className="text-xs text-gray-400">{new Date(item.news_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-400">No news at this time.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Schools */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-bdja-dark">OUR SCHOOLS</h3>
              <p className="text-sm text-gray-500">Playgroup to Grade 6</p>
            </div>
            <Link href="/academics" className="text-sm text-bdja-primary hover:underline flex items-center gap-1">
              View All Levels <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
            {grades.length > 0 ? grades.map((grade) => (
              <Link key={grade.grade_key} href={`/academics/${grade.grade_key}`} className="group">
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:shadow-lg hover:border-bdja-primary/30 transition-all">
                  <div className="w-14 h-14 mx-auto mb-2 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-bdja-primary/5 transition-colors">
                    <Image src={`/grades/${grade.icon_filename}`} alt={grade.display_name} width={48} height={48} className="object-contain" />
                  </div>
                  <p className="text-xs font-medium text-bdja-dark">{grade.display_name}</p>
                </div>
              </Link>
            )) : (
              ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"].map((g) => (
                <div key={g} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="w-14 h-14 mx-auto mb-2 bg-gray-50 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-xs font-medium text-bdja-dark">{g}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.length > 0 ? stats.map((stat) => {
              const Icon = iconMap[stat.icon_name] || Users;
              return (
                <div key={stat.id} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-bdja-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-bdja-dark">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              );
            }) : (
              <>
                <div className="flex items-center gap-4"><Users className="w-8 h-8 text-bdja-primary" /><div><p className="text-xl font-bold">500+</p><p className="text-xs text-gray-500">Happy Learners</p></div></div>
                <div className="flex items-center gap-4"><Users className="w-8 h-8 text-bdja-primary" /><div><p className="text-xl font-bold">40+</p><p className="text-xs text-gray-500">Dedicated Staff</p></div></div>
                <div className="flex items-center gap-4"><BookOpen className="w-8 h-8 text-bdja-primary" /><div><p className="text-xl font-bold">10+</p><p className="text-xs text-gray-500">Years of Excellence</p></div></div>
                <div className="flex items-center gap-4"><BookOpen className="w-8 h-8 text-bdja-primary" /><div><p className="text-xl font-bold"></p><p className="text-xs text-gray-500">Holistic Learning Approach</p></div></div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Mission & Objective Banner */}
      <section className="py-16 bg-bdja-primary text-white">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold">Our Mission & Vision</h2>
          <p className="text-white/80 text-sm md:text-base leading-relaxed">
            <strong>Mission:</strong> To encourage children in learning opportunity.
          </p>
          <p className="text-white/80 text-sm md:text-base leading-relaxed">
            <strong>Objective:</strong> To empower children to make a difference in their lives, the life of their community and the wider world.
          </p>
          <p className="text-bdja-secondary font-medium text-sm">
            Curriculum: CBC (Competency Based Curriculum) &middot; Grades: Playgroup, PP1, PP2, Grade 1 through Grade 6
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-bdja-dark text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-5 gap-8">
            {/* Newsletter */}
            <div className="md:col-span-1">
              <h4 className="text-sm font-bold uppercase tracking-wide mb-4">Newsletter</h4>
              <p className="text-xs text-gray-400 mb-3">Subscribe to our newsletter to get the latest news and updates.</p>
              <div className="space-y-2">
                <input type="email" placeholder="Enter your email" className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-bdja-secondary" />
                <button className="w-full px-3 py-2 bg-bdja-secondary text-white text-sm font-medium rounded hover:opacity-90 transition-opacity">
                  Subscribe
                </button>
              </div>
            </div>

            {/* Footer Links */}
            {Object.entries(groupedFooter).map(([section, links]) => (
              <div key={section}>
                <h4 className="text-sm font-bold uppercase tracking-wide mb-4">{section}</h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a href={link.url} className="text-xs text-gray-400 hover:text-white transition-colors">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Contact Us */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide mb-4">Contact Us</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-xs text-gray-400">
                  <MapPin className="w-4 h-4 text-bdja-secondary flex-shrink-0 mt-0.5" />
                  <span>P.O. Box 3013-10400<br />Near Peaks Hotel, Nanyuki–Nturukuma, Kenya</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-400">
                  <Phone className="w-4 h-4 text-bdja-secondary flex-shrink-0" />
                  <span>0708 449 158</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-400">
                  <MailIcon className="w-4 h-4 text-bdja-secondary flex-shrink-0" />
                  <span>bishopdavisjoyacademy@gmail.com</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-400">
                  <Globe className="w-4 h-4 text-bdja-secondary flex-shrink-0" />
                  <span>www.bdja.ac.ke</span>
                </li>
              </ul>
              <div className="flex items-center gap-3 mt-4">
                {socialLinks.map((sl) => {
                  const Icon = socialIconMap[sl.platform] || Globe;
                  return (
                    <a key={sl.platform} href={sl.url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white/10 rounded flex items-center justify-center hover:bg-bdja-secondary transition-colors">
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
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
