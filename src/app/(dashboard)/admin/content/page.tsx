"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Loader2, FileText, BookOpen, Video, Plus, Trash2, Edit3, X, Save, Search,
  ExternalLink, Eye, EyeOff, CheckCircle, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import Image from "next/image";

type TabKey = "cms" | "library" | "vora";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface LibraryResource {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  subject: string | null;
  grade_level: string | null;
  is_public: boolean;
  created_at: string;
}

interface VoraVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  subject: string;
  grade_level: string;
  topic: string | null;
  duration: string | null;
  thumbnail_url: string | null;
  is_public: boolean;
  created_at: string;
}

const SUBJECTS = ["Mathematics", "English", "Kiswahili", "Science", "Social Studies", "CRE", "ICT", "Art", "Music", "PE"];
const GRADES = ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];
const FILE_TYPES = ["pdf", "doc", "docx", "ppt", "pptx", "image", "video", "audio", "other"];

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("cms");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // CMS
  const [cmsPages, setCmsPages] = useState<CmsPage[]>([]);
  const [showCmsForm, setShowCmsForm] = useState(false);
  const [cmsForm, setCmsForm] = useState({ id: "", slug: "", title: "", content: "", is_published: true });

  // Library
  const [libraryResources, setLibraryResources] = useState<LibraryResource[]>([]);
  const [showLibForm, setShowLibForm] = useState(false);
  const [libForm, setLibForm] = useState({ id: "", title: "", description: "", file_url: "", file_type: "pdf", subject: "Mathematics", grade_level: "Grade 1", is_public: true });

  // VORA
  const [voraVideos, setVoraVideos] = useState<VoraVideo[]>([]);
  const [showVoraForm, setShowVoraForm] = useState(false);
  const [voraForm, setVoraForm] = useState({ id: "", title: "", description: "", video_url: "", subject: "Mathematics", grade_level: "Grade 1", topic: "", duration: "", thumbnail_url: "", is_public: true });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cmsData, libData, voraData] = await Promise.all([
        apiGet<{ pages: CmsPage[] }>("/api/admin/pages").catch(() => ({ pages: [] })),
        apiGet<{ resources: LibraryResource[] }>("/api/library").catch(() => ({ resources: [] })),
        apiGet<{ videos: VoraVideo[] }>("/api/admin/vora").catch(() => ({ videos: [] })),
      ]);
      setCmsPages(cmsData.pages || []);
      setLibraryResources(libData.resources || []);
      setVoraVideos(voraData.videos || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── CMS CRUD ──
  const saveCms = async () => {
    if (!cmsForm.slug.trim() || !cmsForm.title.trim()) {
      toast.error("Slug and title are required");
      return;
    }
    try {
      if (cmsForm.id) {
        await apiPut("/api/admin/pages", cmsForm);
        toast.success("Page updated");
      } else {
        await apiPost("/api/admin/pages", cmsForm);
        toast.success("Page created");
      }
      setShowCmsForm(false);
      setCmsForm({ id: "", slug: "", title: "", content: "", is_published: true });
      fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteCms = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    try {
      await apiDelete(`/api/admin/pages?id=${id}`);
      toast.success("Page deleted");
      fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const editCms = (page: CmsPage) => {
    setCmsForm({ id: page.id, slug: page.slug, title: page.title, content: page.content, is_published: page.is_published });
    setShowCmsForm(true);
  };

  // ── Library CRUD ──
  const saveLib = async () => {
    if (!libForm.title.trim() || !libForm.file_url.trim()) {
      toast.error("Title and file URL are required");
      return;
    }
    try {
      if (libForm.id) {
        await apiPut("/api/library", libForm);
        toast.success("Resource updated");
      } else {
        await apiPost("/api/library", libForm);
        toast.success("Resource added");
      }
      setShowLibForm(false);
      setLibForm({ id: "", title: "", description: "", file_url: "", file_type: "pdf", subject: "Mathematics", grade_level: "Grade 1", is_public: true });
      fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteLib = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    try {
      await apiDelete(`/api/library?id=${id}`);
      toast.success("Resource deleted");
      fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const editLib = (res: LibraryResource) => {
    setLibForm({
      id: res.id,
      title: res.title,
      description: res.description || "",
      file_url: res.file_url,
      file_type: res.file_type,
      subject: res.subject || "Mathematics",
      grade_level: res.grade_level || "Grade 1",
      is_public: res.is_public,
    });
    setShowLibForm(true);
  };

  // ── VORA CRUD ──
  const saveVora = async () => {
    if (!voraForm.title.trim() || !voraForm.video_url.trim()) {
      toast.error("Title and video URL are required");
      return;
    }
    try {
      if (voraForm.id) {
        await apiPut("/api/admin/vora", voraForm);
        toast.success("Video updated");
      } else {
        await apiPost("/api/admin/vora", voraForm);
        toast.success("Video added");
      }
      setShowVoraForm(false);
      setVoraForm({ id: "", title: "", description: "", video_url: "", subject: "Mathematics", grade_level: "Grade 1", topic: "", duration: "", thumbnail_url: "", is_public: true });
      fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteVora = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    try {
      await apiDelete(`/api/admin/vora?id=${id}`);
      toast.success("Video deleted");
      fetchAll();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const editVora = (vid: VoraVideo) => {
    setVoraForm({
      id: vid.id,
      title: vid.title,
      description: vid.description || "",
      video_url: vid.video_url,
      subject: vid.subject,
      grade_level: vid.grade_level,
      topic: vid.topic || "",
      duration: vid.duration || "",
      thumbnail_url: vid.thumbnail_url || "",
      is_public: vid.is_public,
    });
    setShowVoraForm(true);
  };

  const filteredCms = cmsPages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );
  const filteredLib = libraryResources.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.subject || "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredVora = voraVideos.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.subject.toLowerCase().includes(search.toLowerCase()) ||
    (v.topic || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Content Management</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-1">
        {[
          { key: "cms" as TabKey, label: "CMS Pages", icon: FileText },
          { key: "library" as TabKey, label: "Library", icon: BookOpen },
          { key: "vora" as TabKey, label: "VORA Videos", icon: Video },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? "text-amber-400 border-b-2 border-amber-400 bg-amber-400/5"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CMS Pages Tab ── */}
      {activeTab === "cms" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">CMS Pages ({filteredCms.length})</h2>
            <Button onClick={() => { setCmsForm({ id: "", slug: "", title: "", content: "", is_published: true }); setShowCmsForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> New Page
            </Button>
          </div>

          {showCmsForm && (
            <Card className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-white">{cmsForm.id ? "Edit Page" : "New Page"}</h3>
                <button onClick={() => setShowCmsForm(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Slug</label>
                  <Input value={cmsForm.slug} onChange={(e) => setCmsForm((p) => ({ ...p, slug: e.target.value }))} placeholder="about-us" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Title</label>
                  <Input value={cmsForm.title} onChange={(e) => setCmsForm((p) => ({ ...p, title: e.target.value }))} placeholder="About Us" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Content (Markdown/HTML supported)</label>
                <textarea
                  value={cmsForm.content}
                  onChange={(e) => setCmsForm((p) => ({ ...p, content: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm focus:ring-2 focus:ring-amber-400 outline-none resize-y"
                  placeholder="# About Us\n\nWrite your page content here..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cms-pub"
                  checked={cmsForm.is_published}
                  onChange={(e) => setCmsForm((p) => ({ ...p, is_published: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-600 text-amber-400 focus:ring-amber-400"
                />
                <label htmlFor="cms-pub" className="text-sm text-gray-300">Published</label>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveCms}><Save className="w-4 h-4 mr-2" />{cmsForm.id ? "Update" : "Create"}</Button>
                <Button variant="outline" onClick={() => setShowCmsForm(false)}>Cancel</Button>
              </div>
            </Card>
          )}

          <div className="grid gap-3">
            {filteredCms.map((page) => (
              <Card key={page.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-white truncate">{page.title}</h3>
                    <Badge variant={page.is_published ? "success" : "default"}>
                      {page.is_published ? <><Eye className="w-3 h-3 mr-1" />Published</> : <><EyeOff className="w-3 h-3 mr-1" />Draft</>}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">/{page.slug}</p>
                  <p className="text-sm text-gray-400 line-clamp-2">{page.content.slice(0, 120)}...</p>
                  <p className="text-xs text-gray-600 mt-1">Updated {new Date(page.updated_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => editCms(page)}><Edit3 className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteCms(page.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
            {filteredCms.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No CMS pages found.</p>
                <p className="text-sm">Create your first page to get started.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Library Tab ── */}
      {activeTab === "library" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Library Resources ({filteredLib.length})</h2>
            <Button onClick={() => { setLibForm({ id: "", title: "", description: "", file_url: "", file_type: "pdf", subject: "Mathematics", grade_level: "Grade 1", is_public: true }); setShowLibForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Resource
            </Button>
          </div>

          {showLibForm && (
            <Card className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-white">{libForm.id ? "Edit Resource" : "New Resource"}</h3>
                <button onClick={() => setShowLibForm(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input value={libForm.title} onChange={(e) => setLibForm((p) => ({ ...p, title: e.target.value }))} placeholder="Resource title" />
                <Input value={libForm.file_url} onChange={(e) => setLibForm((p) => ({ ...p, file_url: e.target.value }))} placeholder="File URL" />
              </div>
              <Input value={libForm.description} onChange={(e) => setLibForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select value={libForm.file_type} onChange={(e) => setLibForm((p) => ({ ...p, file_type: e.target.value }))} className="px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                  {FILE_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
                <select value={libForm.subject} onChange={(e) => setLibForm((p) => ({ ...p, subject: e.target.value }))} className="px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={libForm.grade_level} onChange={(e) => setLibForm((p) => ({ ...p, grade_level: e.target.value }))} className="px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="lib-pub" checked={libForm.is_public} onChange={(e) => setLibForm((p) => ({ ...p, is_public: e.target.checked }))} className="w-4 h-4 rounded border-gray-600 text-amber-400" />
                <label htmlFor="lib-pub" className="text-sm text-gray-300">Public</label>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveLib}><Save className="w-4 h-4 mr-2" />{libForm.id ? "Update" : "Add"}</Button>
                <Button variant="outline" onClick={() => setShowLibForm(false)}>Cancel</Button>
              </div>
            </Card>
          )}

          <div className="grid gap-3">
            {filteredLib.map((res) => (
              <Card key={res.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-white">{res.title}</h3>
                    <Badge variant="info">{res.file_type.toUpperCase()}</Badge>
                    <Badge variant={res.is_public ? "success" : "default"}>{res.is_public ? "Public" : "Private"}</Badge>
                  </div>
                  <p className="text-sm text-gray-400">{res.subject} • {res.grade_level}</p>
                  <p className="text-xs text-gray-500 mt-1">{res.description?.slice(0, 100)}...</p>
                  <a href={res.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:underline flex items-center gap-1 mt-1">
                    <ExternalLink className="w-3 h-3" /> Open file
                  </a>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => editLib(res)}><Edit3 className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteLib(res.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
            {filteredLib.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No library resources found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VORA Videos Tab ── */}
      {activeTab === "vora" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">VORA Videos ({filteredVora.length})</h2>
            <Button onClick={() => { setVoraForm({ id: "", title: "", description: "", video_url: "", subject: "Mathematics", grade_level: "Grade 1", topic: "", duration: "", thumbnail_url: "", is_public: true }); setShowVoraForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Video
            </Button>
          </div>

          {showVoraForm && (
            <Card className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-white">{voraForm.id ? "Edit Video" : "New Video"}</h3>
                <button onClick={() => setShowVoraForm(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input value={voraForm.title} onChange={(e) => setVoraForm((p) => ({ ...p, title: e.target.value }))} placeholder="Video title" />
                <Input value={voraForm.video_url} onChange={(e) => setVoraForm((p) => ({ ...p, video_url: e.target.value }))} placeholder="YouTube / Video URL" />
              </div>
              <Input value={voraForm.description} onChange={(e) => setVoraForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select value={voraForm.subject} onChange={(e) => setVoraForm((p) => ({ ...p, subject: e.target.value }))} className="px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={voraForm.grade_level} onChange={(e) => setVoraForm((p) => ({ ...p, grade_level: e.target.value }))} className="px-3 py-2 rounded-lg bg-slate-800 border border-gray-700 text-white text-sm">
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <Input value={voraForm.duration} onChange={(e) => setVoraForm((p) => ({ ...p, duration: e.target.value }))} placeholder="Duration (e.g. 10:30)" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input value={voraForm.topic} onChange={(e) => setVoraForm((p) => ({ ...p, topic: e.target.value }))} placeholder="Topic / Unit" />
                <Input value={voraForm.thumbnail_url} onChange={(e) => setVoraForm((p) => ({ ...p, thumbnail_url: e.target.value }))} placeholder="Thumbnail URL (optional)" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="vora-pub" checked={voraForm.is_public} onChange={(e) => setVoraForm((p) => ({ ...p, is_public: e.target.checked }))} className="w-4 h-4 rounded border-gray-600 text-amber-400" />
                <label htmlFor="vora-pub" className="text-sm text-gray-300">Public</label>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveVora}><Save className="w-4 h-4 mr-2" />{voraForm.id ? "Update" : "Add"}</Button>
                <Button variant="outline" onClick={() => setShowVoraForm(false)}>Cancel</Button>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVora.map((vid) => (
              <Card key={vid.id} className="overflow-hidden">
                <div className="aspect-video bg-slate-800 relative">
                  {vid.thumbnail_url ? (
                    <Image src={vid.thumbnail_url} alt={vid.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-10 h-10 text-gray-600" />
                    </div>
                  )}
                  {vid.duration && (
                    <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">{vid.duration}</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-white text-sm line-clamp-1">{vid.title}</h3>
                    <Badge variant={vid.is_public ? "success" : "default"} className="text-[10px]">{vid.is_public ? "Public" : "Private"}</Badge>
                  </div>
                  <p className="text-xs text-gray-400">{vid.subject} • {vid.grade_level}</p>
                  {vid.topic && <p className="text-xs text-gray-500 mt-0.5">{vid.topic}</p>}
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">{vid.description}</p>
                  <div className="flex gap-1 mt-3">
                    <a href={vid.video_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button size="sm" variant="outline" className="w-full text-xs"><ExternalLink className="w-3 h-3 mr-1" />Watch</Button>
                    </a>
                    <Button size="sm" variant="ghost" onClick={() => editVora(vid)}><Edit3 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteVora(vid.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </Card>
            ))}
            {filteredVora.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No VORA videos found.</p>
                <p className="text-sm">Add educational videos for students.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
