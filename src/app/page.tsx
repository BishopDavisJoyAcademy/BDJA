"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  GraduationCap, BookOpen, Users, Trophy, MapPin, Clock,
  ArrowRight, ChevronRight, Star, Heart, Lightbulb, Shield
} from "lucide-react";

const HERO_SLIDES = [
  { src: "/slides/hero-1.jpg", alt: "BDJA Campus" },
  { src: "/slides/hero-2.jpg", alt: "Students learning" },
  { src: "/slides/hero-3.jpg", alt: "School activities" },
];

const GRADES = [
  { name: "Playgroup", icon: "/grades/playgroup-icon.png", level: "Early Years" },
  { name: "PP1", icon: "/grades/pp1-icon.png", level: "Early Years" },
  { name: "PP2", icon: "/grades/pp2-icon.png", level: "Early Years" },
  { name: "Grade 1", icon: "/grades/grade1-icon.png", level: "Lower Primary" },
  { name: "Grade 2", icon: "/grades/grade2-icon.png", level: "Lower Primary" },
  { name: "Grade 3", icon: "/grades/grade3-icon.png", level: "Lower Primary" },
  { name: "Grade 4", icon: "/grades/grade4-icon.png", level: "Upper Primary" },
  { name: "Grade 5", icon: "/grades/grade5-icon.png", level: "Upper Primary" },
  { name: "Grade 6", icon: "/grades/grade6-icon.png", level: "Upper Primary" },
];

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Academic Excellence",
    desc: "Rigorous curriculum designed to challenge and inspire every student to reach their full potential.",
  },
  {
    icon: Heart,
    title: "Holistic Development",
    desc: "We nurture the whole child — academically, socially, emotionally, and physically.",
  },
  {
    icon: Lightbulb,
    title: "Modern Facilities",
    desc: "State-of-the-art classrooms, laboratories, and sports facilities for optimal learning.",
  },
  {
    icon: Shield,
    title: "Safe Environment",
    desc: "A secure, inclusive campus where every child feels valued, respected, and protected.",
  },
  {
    icon: Users,
    title: "Expert Faculty",
    desc: "Passionate, qualified educators committed to bringing out the best in every learner.",
  },
  {
    icon: Trophy,
    title: "Proven Results",
    desc: "Consistently high performance in national assessments and co-curricular competitions.",
  },
];

function BlindsHero() {
  const [current, setCurrent] = useState(0);
  const [blindPhase, setBlindPhase] = useState<"idle" | "closing" | "opening">("idle");
  const BLIND_COUNT = 6;

  const nextSlide = useCallback(() => {
    if (blindPhase !== "idle") return;
    setBlindPhase("closing");
    setTimeout(() => {
      setCurrent((p) => (p + 1) % HERO_SLIDES.length);
      setBlindPhase("opening");
      setTimeout(() => setBlindPhase("idle"), 700);
    }, 600);
  }, [blindPhase]);

  useEffect(() => {
    const timer = setInterval(nextSlide, 7000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <section className="relative h-[70vh] sm:h-[80vh] min-h-[480px] max-h-[800px] overflow-hidden bg-slate-950">
      {/* Background image — uses object-cover with center positioning, responsive */}
      <div className="absolute inset-0">
        <Image
          src={HERO_SLIDES[current].src}
          alt={HERO_SLIDES[current].alt}
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-slate-950/30" />
      </div>

      {/* Blinds overlay */}
      <div className="absolute inset-0 flex pointer-events-none z-10">
        {Array.from({ length: BLIND_COUNT }).map((_, i) => {
          const isClosing = blindPhase === "closing";
          const isOpening = blindPhase === "opening";
          const delay = i * 0.05;
          return (
            <motion.div
              key={i}
              className="flex-1 bg-slate-950 origin-top"
              initial={{ scaleY: 0 }}
              animate={{
                scaleY: isClosing ? 1 : isOpening ? 0 : 0,
              }}
              transition={{
                duration: 0.45,
                delay: isClosing ? delay : isOpening ? (BLIND_COUNT - 1 - i) * 0.05 : 0,
                ease: [0.4, 0, 0.2, 1],
              }}
              style={{ transformOrigin: "top" }}
            />
          );
        })}
      </div>

      {/* Content */}
      <div className="relative z-20 h-full flex flex-col justify-end pb-16 sm:pb-20 px-5 sm:px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, delay: blindPhase === "opening" ? 0.35 : 0 }}
            className="max-w-xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-4">
              <Star className="w-3 h-3" />
              Excellence in Education
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight tracking-tight">
              Shaping Tomorrow&apos;s
              <span className="block text-amber-400">Leaders Today</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-md">
              At Bishop Davis Joy Academy, we believe every child deserves a foundation
              of excellence. Join us in nurturing minds, building character, and inspiring greatness.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/admissions"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors"
              >
                Apply Now <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl text-sm transition-colors"
              >
                Learn More <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Slide indicators */}
        <div className="flex items-center gap-2 mt-8">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i !== current && blindPhase === "idle") {
                  setBlindPhase("closing");
                  setTimeout(() => {
                    setCurrent(i);
                    setBlindPhase("opening");
                    setTimeout(() => setBlindPhase("idle"), 700);
                  }, 600);
                }
              }}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === current ? "w-8 bg-amber-400" : "w-4 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function InfiniteMarquee() {
  const doubled = [...GRADES, ...GRADES, ...GRADES];
  return (
    <section className="py-14 bg-slate-950 border-y border-slate-800/40 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Grades Offered</h2>
        </div>
        <p className="text-sm text-slate-500">Comprehensive programs from early years through upper primary</p>
      </div>

      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

        <div className="marquee-track flex gap-4 animate-marquee">
          {doubled.map((grade, i) => (
            <div
              key={`${grade.name}-${i}`}
              className="shrink-0 w-36 sm:w-40 group relative rounded-xl overflow-hidden border border-slate-700/30 hover:border-amber-500/25 transition-all"
            >
              {/* The image IS the card */}
              <div className="relative w-full aspect-square">
                <Image
                  src={grade.icon}
                  alt={grade.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="160px"
                />
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                {/* Text overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-semibold text-sm">{grade.name}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">{grade.level}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white">Why Choose BDJA?</h2>
          <p className="mt-2 text-slate-400 text-sm max-w-md mx-auto">
            A legacy of excellence built on strong values, modern teaching, and unwavering commitment to every learner.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="p-6 rounded-2xl bg-slate-900/40 border border-slate-700/30 hover:border-amber-500/15 hover:bg-slate-800/40 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/8 border border-amber-500/15 flex items-center justify-center mb-4 group-hover:bg-amber-500/12 transition-colors">
                  <Icon className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-white font-medium text-base mb-1.5">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { value: "500+", label: "Students Enrolled", icon: Users },
    { value: "50+", label: "Expert Teachers", icon: GraduationCap },
    { value: "9", label: "Grade Levels", icon: BookOpen },
    { value: "100%", label: "Commitment", icon: Heart },
  ];
  return (
    <section className="py-16 bg-slate-900/30 border-y border-slate-800/40">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="text-center p-5 rounded-2xl bg-slate-800/20 border border-slate-700/20"
              >
                <Icon className="w-5 h-5 text-amber-400/70 mx-auto mb-2" />
                <p className="text-2xl font-semibold text-white">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function QuickInfo() {
  return (
    <section className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white leading-snug">
              A Place Where Every Child
              <span className="text-amber-400"> Thrives</span>
            </h2>
            <p className="mt-4 text-slate-400 text-sm leading-relaxed">
              Bishop Davis Joy Academy is more than a school — it is a community dedicated to
              unlocking potential. From playgroup to Grade 6, we provide a structured, nurturing
              environment where curiosity is encouraged, discipline is instilled, and success is celebrated.
            </p>
            <div className="mt-8 space-y-4">
              {[
                { icon: MapPin, text: "Near Peaks Hotel, Nanyuki, Kenya" },
                { icon: Clock, text: "Monday – Friday, 7:30 AM – 4:00 PM" },
                { icon: BookOpen, text: "CBC & Integrated Curriculum" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/40 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-amber-400/70" />
                    </div>
                    {item.text}
                  </div>
                );
              })}
            </div>
            <div className="mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl text-sm transition-colors"
              >
                Visit Our Campus <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="relative h-72 sm:h-80 lg:h-96 rounded-2xl overflow-hidden border border-slate-700/30">
            <Image
              src="/slides/hero-2.jpg"
              alt="BDJA Students"
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="relative rounded-2xl overflow-hidden border border-slate-700/30 bg-slate-900/40 p-10 sm:p-14 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />
          <h2 className="text-2xl sm:text-3xl font-semibold text-white relative z-10">
            Ready to Join BDJA?
          </h2>
          <p className="mt-3 text-slate-400 text-sm max-w-md mx-auto relative z-10">
            Begin your child&apos;s journey to excellence. Admissions are open for all grades.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 relative z-10">
            <Link
              href="/admissions"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors"
            >
              Start Admission <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl text-sm transition-colors"
            >
              Contact Us <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="bg-slate-950">
      <BlindsHero />
      <InfiniteMarquee />
      <Features />
      <Stats />
      <QuickInfo />
      <CTA />
    </div>
  );
}
