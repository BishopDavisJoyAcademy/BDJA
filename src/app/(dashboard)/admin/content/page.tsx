"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";
import {
  Image, FileText, BarChart3, GraduationCap, Link2, MessageSquare,
  Plus, Trash2, Save, Eye, EyeOff, X
} from "lucide-react";

type Tab = "carousel" | "notices" | "news" | "stats" | "grades" | "director" | "links";

export default function ContentManagerPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("carousel");
  const [loading, setLoading] = useState(false);

  const [carousel, setCarousel] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [director, setDirector] = useState<any>(null);
  const [quickLinks, setQuickLinks] = useState<any[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [
      { data: c }, { data: n }, { data: ns }, { data: st },
      { data: gr }, { data: dm }, { data: ql }
    ] = await Promise.all([
      supabase.from("homepage_carousel").select("*").order("display_order"),
      supabase.from("homepage_notices").select("*").order("is_pinned", { ascending: false }).order("notice_date", { ascending: false }),
      supabase.from("homepage_news").select("*").order("news_date", { ascending: false }),
      supabase.from("homepage_stats").select("*").order("display_order"),
      supabase.from("homepage_grade_levels").select("*").order("display_order"),
      supabase.from("homepage_director_message").select("*").eq("is_active", true).maybeSingle(),
      supabase.from("homepage_quick_links").select("*").order("display_order"),
    ]);
    setCarousel(c || []);
    setNotices(n || []);
    setNews(ns || []);
    setStats(st || []);
    setGrades(gr || []);
    setDirector(dm || { director_name: "", director_title: "Director", message: "", is_active: true });
    setQuickLinks(ql || []);
    setLoading(false);
  };

  const saveItem = async (table: string, item: any) => {
    const payload = { ...item };
    delete payload.created_at;
    delete payload.updated_at;
    if (payload.id) {
      const { error } = await supabase.from(table).update(payload).eq("id", payload.id);
      if (error) toast.error(error.message);
      else toast.success("Saved");
    } else {
      const { error } = await supabase.from(table).insert({ ...payload, created_by: user?.id });
      if (error) toast.error(error.message);
      else toast.success("Created");
    }
    loadAll();
  };

  const deleteItem = async (table: string, id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from(table).delete().eq("id", id);
    loadAll();
  };

  const toggleActive = async (table: string, id: string, current: boolean) => {
    await supabase.from(table).update({ is_active: !current }).eq("id", id);
    loadAll();
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "carousel", label: "Carousel", icon: Image },
    { key: "notices", label: "Notices", icon: FileText },
    { key: "news", label: "News", icon: MessageSquare },
    { key: "stats", label: "Stats", icon: BarChart3 },
    { key: "grades", label: "Grades", icon: GraduationCap },
    { key: "director", label: "Director", icon: MessageSquare },
    { key: "links", label: "Quick Links", icon: Link2 },
  ];

  if (loading && carousel.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-bdja-primary to-bdja-accent rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Content Manager</h1>
        <p className="text-white/80 mt-1">Manage all homepage content without editing code</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.key ? "bg-bdja-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* CAROUSEL */}
      {activeTab === "carousel" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Hero Carousel Slides</CardTitle>
            <Button size="sm" onClick={() => setCarousel([...carousel, { title: "", subtitle: "", description: "", button_text: "Discover More", button_link: "/about", display_order: carousel.length, is_active: true }])}>
              <Plus className="w-4 h-4 mr-1" /> Add Slide
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {carousel.map((slide, idx) => (
              <div key={slide.id || idx} className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
                <div className="grid md:grid-cols-2 gap-3">
                  <Input placeholder="Title" value={slide.title} onChange={(e) => { const copy = [...carousel]; copy[idx].title = e.target.value; setCarousel(copy); }} />
                  <Input placeholder="Subtitle" value={slide.subtitle || ""} onChange={(e) => { const copy = [...carousel]; copy[idx].subtitle = e.target.value; setCarousel(copy); }} />
                </div>
                <Input placeholder="Description" value={slide.description || ""} onChange={(e) => { const copy = [...carousel]; copy[idx].description = e.target.value; setCarousel(copy); }} />
                <div className="grid md:grid-cols-3 gap-3">
                  <Input placeholder="Image URL" value={slide.image_url || ""} onChange={(e) => { const copy = [...carousel]; copy[idx].image_url = e.target.value; setCarousel(copy); }} />
                  <Input placeholder="Button Text" value={slide.button_text || ""} onChange={(e) => { const copy = [...carousel]; copy[idx].button_text = e.target.value; setCarousel(copy); }} />
                  <Input placeholder="Button Link" value={slide.button_link || ""} onChange={(e) => { const copy = [...carousel]; copy[idx].button_link = e.target.value; setCarousel(copy); }} />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => saveItem("homepage_carousel", slide)}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                  <Button size="sm" variant="outline" onClick={() => slide.id && toggleActive("homepage_carousel", slide.id, slide.is_active)}>
                    {slide.is_active ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}{slide.is_active ? "Hide" : "Show"}
                  </Button>
                  {slide.id && <Button size="sm" variant="danger" onClick={() => deleteItem("homepage_carousel", slide.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* NOTICES */}
      {activeTab === "notices" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Notice Board</CardTitle>
            <Button size="sm" onClick={() => setNotices([...notices, { title: "", content: "", notice_date: new Date().toISOString().split("T")[0], icon_type: "document", is_pinned: false, is_active: true }])}>
              <Plus className="w-4 h-4 mr-1" /> Add Notice
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {notices.map((notice, idx) => (
              <div key={notice.id || idx} className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
                <div className="grid md:grid-cols-2 gap-3">
                  <Input placeholder="Title" value={notice.title} onChange={(e) => { const copy = [...notices]; copy[idx].title = e.target.value; setNotices(copy); }} />
                  <Input type="date" value={notice.notice_date} onChange={(e) => { const copy = [...notices]; copy[idx].notice_date = e.target.value; setNotices(copy); }} />
                </div>
                <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary min-h-[80px]"
                  placeholder="Content" value={notice.content || ""} onChange={(e) => { const copy = [...notices]; copy[idx].content = e.target.value; setNotices(copy); }} />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => saveItem("homepage_notices", notice)}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                  <Button size="sm" variant="outline" onClick={() => notice.id && toggleActive("homepage_notices", notice.id, notice.is_active)}>
                    {notice.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  {notice.id && <Button size="sm" variant="danger" onClick={() => deleteItem("homepage_notices", notice.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* NEWS */}
      {activeTab === "news" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Latest News</CardTitle>
            <Button size="sm" onClick={() => setNews([...news, { title: "", excerpt: "", content: "", news_date: new Date().toISOString().split("T")[0], category: "general", is_featured: false, is_active: true }])}>
              <Plus className="w-4 h-4 mr-1" /> Add News
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {news.map((item, idx) => (
              <div key={item.id || idx} className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
                <div className="grid md:grid-cols-2 gap-3">
                  <Input placeholder="Title" value={item.title} onChange={(e) => { const copy = [...news]; copy[idx].title = e.target.value; setNews(copy); }} />
                  <Input type="date" value={item.news_date} onChange={(e) => { const copy = [...news]; copy[idx].news_date = e.target.value; setNews(copy); }} />
                </div>
                <Input placeholder="Excerpt" value={item.excerpt || ""} onChange={(e) => { const copy = [...news]; copy[idx].excerpt = e.target.value; setNews(copy); }} />
                <Input placeholder="Image URL" value={item.image_url || ""} onChange={(e) => { const copy = [...news]; copy[idx].image_url = e.target.value; setNews(copy); }} />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => saveItem("homepage_news", item)}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                  <Button size="sm" variant="outline" onClick={() => item.id && toggleActive("homepage_news", item.id, item.is_active)}>
                    {item.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  {item.id && <Button size="sm" variant="danger" onClick={() => deleteItem("homepage_news", item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* STATS */}
      {activeTab === "stats" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Statistics Counters</CardTitle>
            <Button size="sm" onClick={() => setStats([...stats, { label: "", value: "", icon_name: "users", display_order: stats.length, is_active: true }])}>
              <Plus className="w-4 h-4 mr-1" /> Add Stat
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.map((stat, idx) => (
              <div key={stat.id || idx} className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
                <div className="grid md:grid-cols-3 gap-3">
                  <Input placeholder="Label" value={stat.label} onChange={(e) => { const copy = [...stats]; copy[idx].label = e.target.value; setStats(copy); }} />
                  <Input placeholder="Value" value={stat.value} onChange={(e) => { const copy = [...stats]; copy[idx].value = e.target.value; setStats(copy); }} />
                  <Input placeholder="Icon name" value={stat.icon_name} onChange={(e) => { const copy = [...stats]; copy[idx].icon_name = e.target.value; setStats(copy); }} />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => saveItem("homepage_stats", stat)}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                  {stat.id && <Button size="sm" variant="danger" onClick={() => deleteItem("homepage_stats", stat.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* GRADE LEVELS */}
      {activeTab === "grades" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Grade Level Display</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">Icons must be placed in <code>public/grades/</code>.</p>
            {grades.map((grade, idx) => (
              <div key={grade.id || idx} className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
                <div className="grid md:grid-cols-3 gap-3">
                  <Input placeholder="Display Name" value={grade.display_name} onChange={(e) => { const copy = [...grades]; copy[idx].display_name = e.target.value; setGrades(copy); }} />
                  <Input placeholder="Icon Filename" value={grade.icon_filename} onChange={(e) => { const copy = [...grades]; copy[idx].icon_filename = e.target.value; setGrades(copy); }} />
                  <Input placeholder="Description" value={grade.description || ""} onChange={(e) => { const copy = [...grades]; copy[idx].description = e.target.value; setGrades(copy); }} />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => saveItem("homepage_grade_levels", grade)}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* DIRECTOR MESSAGE */}
      {activeTab === "director" && director && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Director&apos;s Message</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Input placeholder="Director Name" value={director.director_name || ""} onChange={(e) => setDirector({ ...director, director_name: e.target.value })} />
              <Input placeholder="Title" value={director.director_title || ""} onChange={(e) => setDirector({ ...director, director_title: e.target.value })} />
            </div>
            <Input placeholder="Photo URL" value={director.director_photo_url || ""} onChange={(e) => setDirector({ ...director, director_photo_url: e.target.value })} />
            <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary min-h-[120px]"
              placeholder="Message" value={director.message || ""} onChange={(e) => setDirector({ ...director, message: e.target.value })} />
            <Button onClick={() => saveItem("homepage_director_message", director)}><Save className="w-4 h-4 mr-1" /> Save</Button>
          </CardContent>
        </Card>
      )}

      {/* QUICK LINKS */}
      {activeTab === "links" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Quick Links (Top Bar)</CardTitle>
            <Button size="sm" onClick={() => setQuickLinks([...quickLinks, { label: "", url: "", icon_name: "link", target_audience: "all", display_order: quickLinks.length, is_active: true }])}>
              <Plus className="w-4 h-4 mr-1" /> Add Link
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickLinks.map((link, idx) => (
              <div key={link.id || idx} className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
                <div className="grid md:grid-cols-3 gap-3">
                  <Input placeholder="Label" value={link.label} onChange={(e) => { const copy = [...quickLinks]; copy[idx].label = e.target.value; setQuickLinks(copy); }} />
                  <Input placeholder="URL" value={link.url} onChange={(e) => { const copy = [...quickLinks]; copy[idx].url = e.target.value; setQuickLinks(copy); }} />
                  <Input placeholder="Icon" value={link.icon_name} onChange={(e) => { const copy = [...quickLinks]; copy[idx].icon_name = e.target.value; setQuickLinks(copy); }} />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => saveItem("homepage_quick_links", link)}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                  {link.id && <Button size="sm" variant="danger" onClick={() => deleteItem("homepage_quick_links", link.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
