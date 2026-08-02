"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { hasPermission } from "@/lib/permissions";
import { Search, BookOpen, Download, Plus, Trash2, Edit3, FileText, Headphones, Image, Video, Eye, X } from "lucide-react";
import toast from "react-hot-toast";

export default function LibraryPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingResource, setViewingResource] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    resource_type: "pdf",
    file_url: "",
    cover_url: "",
    total_copies: "1",
  });
  const [loading, setLoading] = useState(true);

  const canEdit = user ? hasPermission(user.role, "editLibrary") : false;

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("library_resources")
      .select("*")
      .order("created_at", { ascending: false });
    setResources(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) { toast.error("No permission"); return; }

    const payload = {
      ...formData,
      total_copies: parseInt(formData.total_copies) || 1,
      available_copies: parseInt(formData.total_copies) || 1,
      created_by: user?.id,
    };

    const { error } = await supabase.from("library_resources").insert(payload);
    if (error) { toast.error("Failed to add resource"); return; }
    toast.success("Resource added");
    setIsModalOpen(false);
    setFormData({ title: "", author: "", isbn: "", resource_type: "pdf", file_url: "", cover_url: "", total_copies: "1" });
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this resource?")) return;
    const { error } = await supabase.from("library_resources").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Resource deleted");
    loadData();
  };

  const filtered = resources.filter((r) => {
    const matchesSearch = !searchTerm ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.isbn?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || r.resource_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const typeIcons: Record<string, any> = {
    pdf: FileText,
    epub: BookOpen,
    audio: Headphones,
    video: Video,
    image: Image,
    physical: BookOpen,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bdja-dark">Smart Library</h1>
          <p className="text-gray-500 text-sm mt-1">Search, download, and view all learning resources</p>
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Resource
          </Button>
        )}
      </div>

      {/* Smart Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, author, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary"
              />
            </div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-40">
              <option value="">All Types</option>
              {["pdf", "epub", "audio", "video", "image", "physical"].map((t) => (
                <option key={t} value={t}>{t.toUpperCase()}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-400">No resources found.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((res) => {
            const TypeIcon = typeIcons[res.resource_type] || FileText;
            return (
              <Card key={res.id} className="card-hover overflow-hidden">
                {res.cover_url && (
                  <div className="h-32 bg-gray-100 overflow-hidden">
                    <img src={res.cover_url} alt={res.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4 text-bdja-primary" />
                        <h3 className="font-semibold text-bdja-dark text-sm">{res.title}</h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{res.author || "Unknown author"}</p>
                      {res.isbn && <p className="text-xs text-gray-400">ISBN: {res.isbn}</p>}
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 uppercase">{res.resource_type}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    {res.resource_type === "physical" ? (
                      <p className="text-xs text-gray-500">{res.available_copies} / {res.total_copies} available</p>
                    ) : (
                      <p className="text-xs text-gray-500">Digital resource</p>
                    )}
                    <div className="flex gap-1">
                      {res.file_url && res.resource_type !== "physical" && (
                        <>
                          <button
                            onClick={() => setViewingResource(res)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-bdja-primary" />
                          </button>
                          <a
                            href={res.file_url}
                            download
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                            title="Download"
                          >
                            <Download className="w-4 h-4 text-green-600" />
                          </a>
                        </>
                      )}
                      {canEdit && (
                        <button onClick={() => handleDelete(res.id)} className="p-1.5 hover:bg-red-100 rounded-lg">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Resource Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Library Resource">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          <Input placeholder="Author" value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} />
          <Input placeholder="ISBN (for physical books)" value={formData.isbn} onChange={(e) => setFormData({ ...formData, isbn: e.target.value })} />
          <Select value={formData.resource_type} onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}>
            {["pdf", "epub", "audio", "video", "image", "physical"].map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </Select>
          <Input placeholder="File URL (for digital resources)" value={formData.file_url} onChange={(e) => setFormData({ ...formData, file_url: e.target.value })} />
          <Input placeholder="Cover Image URL (optional)" value={formData.cover_url} onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })} />
          <Input type="number" placeholder="Total Copies (for physical books)" value={formData.total_copies} onChange={(e) => setFormData({ ...formData, total_copies: e.target.value })} />
          <Button type="submit" variant="primary" className="w-full">Add Resource</Button>
        </form>
      </Modal>

      {/* Viewer Modal */}
      <Modal isOpen={!!viewingResource} onClose={() => setViewingResource(null)} title={viewingResource?.title || "Resource"} className="max-w-4xl">
        {viewingResource && (
          <div className="space-y-4">
            {viewingResource.resource_type === "pdf" && (
              <div className="h-[70vh] bg-gray-100 rounded-lg overflow-hidden">
                <iframe src={viewingResource.file_url} className="w-full h-full" title={viewingResource.title} />
              </div>
            )}
            {viewingResource.resource_type === "video" && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video src={viewingResource.file_url} controls className="w-full h-full" />
              </div>
            )}
            {viewingResource.resource_type === "audio" && (
              <div className="p-8 bg-gray-50 rounded-lg text-center">
                <Headphones className="w-12 h-12 text-bdja-primary mx-auto mb-4" />
                <audio src={viewingResource.file_url} controls className="w-full" />
              </div>
            )}
            {viewingResource.resource_type === "image" && (
              <div className="flex justify-center">
                <img src={viewingResource.file_url} alt={viewingResource.title} className="max-w-full max-h-[70vh] rounded-lg" />
              </div>
            )}
            {viewingResource.resource_type === "epub" && (
              <div className="p-8 bg-gray-50 rounded-lg text-center">
                <BookOpen className="w-12 h-12 text-bdja-primary mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-4">EPUB books are best viewed in a dedicated e-reader app.</p>
                <a href={viewingResource.file_url} download className="inline-flex items-center gap-2 px-4 py-2 bg-bdja-primary text-white rounded-lg text-sm hover:bg-bdja-accent transition-colors">
                  <Download className="w-4 h-4" /> Download EPUB
                </a>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{viewingResource.title}</p>
                <p className="text-xs text-gray-500">{viewingResource.author}</p>
              </div>
              <a href={viewingResource.file_url} download className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
                <Download className="w-4 h-4" /> Download
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
