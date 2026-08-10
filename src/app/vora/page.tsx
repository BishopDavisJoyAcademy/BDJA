"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ScrollReveal } from "@/components/ScrollReveal";
import { AuthGateModal } from "@/components/vora/AuthGateModal";
import { VideoPlayerModal } from "@/components/vora/VideoPlayerModal";
import { supabase } from "@/lib/supabase";
import {
  Play, Lock, GraduationCap, Sparkles, ArrowRight, Clock, BookOpen,
  Star, Users, Video, Loader2, Search, Filter, ChevronDown, RotateCcw,
  Flame
} from "lucide-react";

interface VoraItem {
  id: string;
  title: string;
  subject: string;
  category: string;
  topic: string;
  thumbnail_url: string;
  youtube_url: string;
  duration_seconds?: number;
  channel?: string;
  grade_level: string;
  summary?: string;
}

interface ContinueItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  subject: string | null;
  grade_level: string | null;
  duration_seconds: number | null;
  last_watched_at: string | null;
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
  const [content, setContent] = useState<VoraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userGrade, setUserGrade] = useState<string | null>(null);
  const [continueWatching, setContinueWatching] = useState<ContinueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState("");
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VoraItem | null>(null);

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        // Fetch user profile for grade-based recommendations
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_category")
          .eq("id", user.id)
          .limit(1);
        if (profile && profile[0]) {
          // Try to get student grade
          interface StudentGradeRow {
            grade_level: string;
          }
          const { data: studentRows } = await supabase
            .from("students")
            .select("grade_level")
            .eq("id", user.id)
            .limit(1);
          const student = (studentRows?.[0] ?? null) as StudentGradeRow | null;
          if (student) {
            setUserGrade(student.grade_level);
          }
        }
        // Fetch continue watching
        fetchContinueWatching();
      } else {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  // Load all content
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/vora/public?limit=100");
        const data = await res.json();
        setContent(data.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  async function fetchContinueWatching() {
    try {
      const res = await fetch("/api/vora/continue");
      if (res.ok) {
        const data = await res.json();
        setContinueWatching(data.items || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Extract unique values for filters
  const subjects = useMemo(() => {
    const set = new Set<string>();
    content.forEach((c) => { if (c.subject) set.add(c.subject); });
    return ["all", ...Array.from(set).sort()];
  }, [content]);

  const grades = useMemo(() => {
    const set = new Set<string>();
    content.forEach((c) => { if (c.grade_level) set.add(c.grade_level); });
    return ["all", ...Array.from(set).sort()];
  }, [content]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    content.forEach((c) => { if (c.category) set.add(c.category); });
    return ["all", ...Array.from(set).sort()];
  }, [content]);

  // Filter content
  const filtered = useMemo(() => {
    return content.filter((item) => {
      const matchesSearch = !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = selectedSubject === "all" || item.subject === selectedSubject;
      const matchesGrade = selectedGrade === "all" || item.grade_level === selectedGrade;
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesSubject && matchesGrade && matchesCategory;
    });
  }, [content, searchQuery, selectedSubject, selectedGrade, selectedCategory]);

  // Grade-appropriate recommendations for logged-in users
  const forYou = useMemo(() => {
    if (!isLoggedIn || !userGrade) return [];
    return content.filter((c) => c.grade_level === userGrade).slice(0, 6);
  }, [content, isLoggedIn, userGrade]);

  function handleWatch(video: VoraItem) {
    if (!isLoggedIn) {
      setAuthModalTitle(video.title);
      setAuthModalOpen(true);
      return;
    }
    setSelectedVideo(video);
    setPlayerOpen(true);
  }

  function handleContinueWatch(item: ContinueItem) {
    // Find the full video data
    const video = content.find((c) => c.id === item.id);
    if (video) {
      setSelectedVideo(video);
      setPlayerOpen(true);
    }
  }

  return (
    <PublicLayout>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden py-16" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1e3a5f 50%, #0f1f33 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #d4a843 0%, transparent 70%)', filter: 'blur(100px)' }} />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #2a9d8f 0%, transparent 70%)', filter: 'blur(100px)' }} />
        </div>
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
            {isLoggedIn ? (
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(42,157,143,0.2)', color: '#2a9d8f', border: '1px solid rgba(42,157,143,0.3)' }}>
                <GraduationCap className="w-4 h-4" /> Welcome back! Browse the full catalog below.
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/login?redirect=/vora" className="inline-flex items-center gap-2 px-8 py-4 text-white font-bold rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl" style={{ background: 'linear-gradient(135deg, #d4a843, #c9a227)' }}>
                  <GraduationCap className="w-5 h-5" /> Sign In for Full Access
                </Link>
                <Link href="/admissions" className="inline-flex items-center gap-2 px-8 py-4 font-bold rounded-xl border transition-all duration-300 hover:scale-[1.03]" style={{ borderColor: 'rgba(212,168,67,0.4)', color: '#d4a843' }}>
                  New Student? <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </ScrollReveal>
        </div>
      </section>

      {/* ===== CONTINUE WATCHING (logged in only) ===== */}
      {isLoggedIn && continueWatching.length > 0 && (
        <section className="py-10" style={{ background: 'linear-gradient(180deg, #f5f0e8 0%, #ebe5d8 100%)' }}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-2 mb-6">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Continue Watching</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {continueWatching.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleContinueWatch(item)}
                  className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-xl bg-white border border-gray-100"
                >
                  <div className="relative aspect-video overflow-hidden">
                    {item.thumbnail_url ? (
                      <Image src={item.thumbnail_url} alt={item.title} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center"><BookOpen className="w-8 h-8 text-gray-300" /></div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{item.title}</h4>
                    <p className="text-[10px] text-gray-400 mt-1">{item.subject} · {item.grade_level}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== FOR YOU (logged in + grade match) ===== */}
      {isLoggedIn && forYou.length > 0 && (
        <section className="py-10" style={{ background: 'linear-gradient(180deg, #ebe5d8 0%, #f5f0e8 100%)' }}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-2 mb-6">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900">Recommended for Your Grade</h2>
              <span className="text-xs text-gray-500 ml-2">({userGrade})</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {forYou.map((item, i) => (
                <ScrollReveal key={item.id} delay={i * 60}>
                  <div
                    onClick={() => handleWatch(item)}
                    className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl bg-white border border-gray-100"
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <Image src={item.thumbnail_url} alt={item.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
                      <div className={`absolute inset-0 transition-all duration-500 flex items-center justify-center ${hoveredId === item.id ? 'bg-[#0a1628]/70' : 'bg-gradient-to-t from-[#0a1628]/60 via-transparent to-transparent'}`}>
                        {hoveredId === item.id && (
                          <div className="flex flex-col items-center gap-2 animate-fade-in">
                            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                              <Play className="w-6 h-6 text-white ml-1" />
                            </div>
                            <span className="text-xs text-white/80 font-medium">Click to Watch</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white" style={{ backgroundColor: SUBJECT_COLORS[item.subject] || '#2c3e50' }}>
                        {item.subject}
                      </div>
                      {item.duration_seconds && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDuration(item.duration_seconds)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold line-clamp-2 mb-1 transition-colors group-hover:text-[#1e3a5f]" style={{ color: '#0f1f33' }}>{item.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">{item.channel || "BDJA VORA"}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(30,58,95,0.06)', color: '#1e3a5f' }}>{item.grade_level}</span>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

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

      {/* ===== SEARCH & FILTERS ===== */}
      <section className="py-8 sticky top-0 z-30" style={{ background: 'linear-gradient(180deg, #ebe5d8 0%, #f5f0e8 100%)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos by title, topic, or category..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Filter className="w-4 h-4" /> Filters <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-sm">
                {subjects.map((s) => <option key={s} value={s}>{s === "all" ? "All Subjects" : s}</option>)}
              </select>
              <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-sm">
                {grades.map((g) => <option key={g} value={g}>{g === "all" ? "All Grades" : g}</option>)}
              </select>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-sm">
                {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
              </select>
            </div>
          )}

          {!isLoggedIn && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <Lock className="w-3 h-3" />
              <span>Sign in to watch videos. You can browse the full catalog without an account.</span>
            </div>
          )}
        </div>
      </section>

      {/* ===== FULL CATALOG ===== */}
      <section className="py-8 pb-20" style={{ background: 'linear-gradient(180deg, #f5f0e8 0%, #ebe5d8 100%)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Full Catalog</h2>
              <p className="text-sm text-gray-500">{filtered.length} video{filtered.length !== 1 ? "s" : ""} found</p>
            </div>
            {(selectedSubject !== "all" || selectedGrade !== "all" || selectedCategory !== "all" || searchQuery) && (
              <button
                onClick={() => { setSelectedSubject("all"); setSelectedGrade("all"); setSelectedCategory("all"); setSearchQuery(""); }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-10 h-10 text-[#1e3a5f] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-400">No videos match your filters.</p>
              <button onClick={() => { setSelectedSubject("all"); setSelectedGrade("all"); setSelectedCategory("all"); setSearchQuery(""); }} className="mt-2 text-sm text-blue-600 hover:text-blue-800">Clear all filters</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((item, i) => (
                <ScrollReveal key={item.id} delay={i * 40}>
                  <div
                    onClick={() => handleWatch(item)}
                    className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl bg-white border border-gray-100"
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={item.thumbnail_url}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        unoptimized
                      />
                      <div className={`absolute inset-0 transition-all duration-500 flex items-center justify-center ${hoveredId === item.id ? 'bg-[#0a1628]/70' : 'bg-gradient-to-t from-[#0a1628]/60 via-transparent to-transparent'}`}>
                        {hoveredId === item.id && (
                          <div className="flex flex-col items-center gap-2 animate-fade-in">
                            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                              <Play className="w-6 h-6 text-white ml-1" />
                            </div>
                            <span className="text-xs text-white/80 font-medium">{isLoggedIn ? "Click to Watch" : "Sign In to Watch"}</span>
                          </div>
                        )}
                        {!isLoggedIn && hoveredId !== item.id && (
                          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-white/80" />
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white" style={{ backgroundColor: SUBJECT_COLORS[item.subject] || '#2c3e50' }}>
                        {item.subject}
                      </div>
                      {item.duration_seconds && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDuration(item.duration_seconds)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold line-clamp-2 mb-1 transition-colors group-hover:text-[#1e3a5f]" style={{ color: '#0f1f33' }}>{item.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">{item.channel || "BDJA VORA"}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(30,58,95,0.06)', color: '#1e3a5f' }}>{item.grade_level}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1.5 line-clamp-1">{item.category} · {item.topic}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      <AuthGateModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} videoTitle={authModalTitle} />
      <VideoPlayerModal isOpen={playerOpen} onClose={() => { setPlayerOpen(false); setSelectedVideo(null); fetchContinueWatching(); }} video={selectedVideo} />
    </PublicLayout>
  );
}
