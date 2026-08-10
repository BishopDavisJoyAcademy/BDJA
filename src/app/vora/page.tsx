"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ScrollReveal } from "@/components/ScrollReveal";
import { supabase } from "@/lib/supabase";
import {
  Play, Lock, GraduationCap, Sparkles, ArrowRight, Clock, BookOpen,
  Star, Users, Video, Loader2
} from "lucide-react";

interface VoraPreview {
  id: string;
  title: string;
  subject: string;
  category: string;
  topic: string;
  thumbnail_url: string;
  video_url: string;
  duration_seconds?: number;
  channel?: string;
  grade_level: string;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#e74c3c",
  English: "#3498db",
  Science: "#27ae60",
  "Social Studies": "#9b59b6",
  Kiswahili: "#f39c12",
  "Religious Education": "#1abc9c",
  General: "#2c3e50",
};

export default function VoraPublicPage() {
  const router = useRouter();
  const [content, setContent] = useState<VoraPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Check auth and redirect if logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setIsLoggedIn(false);
      } else {
        setIsLoggedIn(true);
        // Small delay so user sees the redirect message
        setTimeout(() => {
          router.push("/manage/vora");
        }, 1500);
      }
    };
    checkAuth();
  }, [router]);

  // Load preview content
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/vora/public?limit=8");
        const data = await res.json();
        setContent(data.content || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <PublicLayout>
      {/* ===== HERO BANNER ===== */}
      <section className="relative overflow-hidden py-20" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1e3a5f 50%, #0f1f33 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #d4a843 0%, transparent 70%)', filter: 'blur(100px)' }} />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #2a9d8f 0%, transparent 70%)', filter: 'blur(100px)' }} />
        </div>
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        <div className="max-w-5xl mx-auto px-4 text-center relative">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ background: 'rgba(212,168,67,0.15)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.3)' }}>
              <Video className="w-3.5 h-3.5" /> Video Learning Platform
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>
              VORA <span style={{ color: '#d4a843' }}>Learning</span>
            </h1>
            <p className="text-white/50 text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Video-based Online Resource for Academic learning. Explore curated educational videos across all subjects and grade levels.
            </p>

            {isLoggedIn === true ? (
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(42,157,143,0.2)', color: '#2a9d8f', border: '1px solid rgba(42,157,143,0.3)' }}>
                <Loader2 className="w-4 h-4 animate-spin" /> Redirecting to your portal...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link
                  href="/login?redirect=/manage/vora"
                  className="inline-flex items-center gap-2 px-8 py-4 text-white font-bold rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
                  style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}
                >
                  <GraduationCap className="w-5 h-5" /> Sign In to Student Portal
                </Link>
                <Link
                  href="/admissions"
                  className="inline-flex items-center gap-2 px-8 py-4 font-bold rounded-xl border transition-all duration-300 hover:scale-[1.03]"
                  style={{ borderColor: 'rgba(212,168,67,0.4)', color: '#d4a843' }}
                >
                  New Student? <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </ScrollReveal>
        </div>
      </section>

      {/* ===== FEATURES BAR ===== */}
      <section className="py-10" style={{ background: 'linear-gradient(180deg, #f5f0e8 0%, #ebe5d8 100%)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Video, label: "Video Lessons", desc: "Curated for CBC", color: "#e74c3c" },
              { icon: BookOpen, label: "All Subjects", desc: "Math, Science, English", color: "#3498db" },
              { icon: Users, label: "All Grades", desc: "Playgroup to Grade 6", color: "#27ae60" },
              { icon: Star, label: "Expert Content", desc: "Verified educators", color: "#f39c12" },
            ].map((feat, i) => (
              <ScrollReveal key={feat.label} delay={i * 80}>
                <div className="flex items-center gap-3 p-4 rounded-xl transition-all duration-300 hover:scale-[1.02]" style={{ background: 'white', border: '1px solid rgba(30,58,95,0.06)' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${feat.color}15` }}>
                    <feat.icon className="w-5 h-5" style={{ color: feat.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#0f1f33' }}>{feat.label}</p>
                    <p className="text-[10px] text-gray-400">{feat.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== VIDEO PREVIEW GRID ===== */}
      <section className="py-16" style={{ background: 'linear-gradient(180deg, #ebe5d8 0%, #f5f0e8 100%)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ background: 'rgba(30,58,95,0.08)', color: '#1e3a5f', border: '1px solid rgba(30,58,95,0.15)' }}>
                <Sparkles className="w-3.5 h-3.5" /> Sample Content
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#0a1628', fontFamily: "'Playfair Display', serif" }}>
                Explore Our <span style={{ color: '#d4a843' }}>Library</span>
              </h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto">Sign in to access the full collection of video lessons.</p>
            </div>
          </ScrollReveal>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-10 h-10 text-[#1e3a5f] animate-spin" />
            </div>
          ) : content.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No preview content available.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {content.map((item, i) => (
                <ScrollReveal key={item.id} delay={i * 80}>
                  <div
                    className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl"
                    style={{ background: 'white', border: '1px solid rgba(30,58,95,0.06)' }}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={item.thumbnail_url}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        unoptimized
                      />
                      {/* Overlay on hover */}
                      <div className={`absolute inset-0 transition-all duration-500 flex items-center justify-center ${hoveredId === item.id ? 'bg-[#0a1628]/70' : 'bg-gradient-to-t from-[#0a1628]/60 via-transparent to-transparent'}`}>
                        {hoveredId === item.id && (
                          <div className="flex flex-col items-center gap-2 animate-fade-in">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}>
                              <Lock className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-white">Sign in to watch</span>
                          </div>
                        )}
                      </div>
                      {/* Duration badge */}
                      {item.duration_seconds && (
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white" style={{ background: 'rgba(0,0,0,0.7)' }}>
                          {formatDuration(item.duration_seconds)}
                        </div>
                      )}
                      {/* Subject badge */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white" style={{ backgroundColor: SUBJECT_COLORS[item.subject] || '#2c3e50' }}>
                        {item.subject}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold line-clamp-2 mb-1 transition-colors group-hover:text-[#1e3a5f]" style={{ color: '#0f1f33' }}>
                        {item.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">{item.channel || "BDJA VORA"}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(30,58,95,0.06)', color: '#1e3a5f' }}>
                          {item.grade_level}
                        </span>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}

          {/* CTA */}
          <ScrollReveal delay={200}>
            <div className="mt-12 text-center">
              <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl" style={{ background: 'linear-gradient(145deg, #1e3a5f 0%, #0f1f33 100%)', border: '1px solid rgba(212,168,67,0.2)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,168,67,0.15)' }}>
                    <Lock className="w-6 h-6 text-[#d4a843]" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold text-sm">Full access requires login</p>
                    <p className="text-white/40 text-xs">Students get unlimited access to all videos</p>
                  </div>
                </div>
                <Link
                  href="/login?redirect=/manage/vora"
                  className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.03] hover:shadow-lg whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}
                >
                  Sign In to View More
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PublicLayout>
  );
}
