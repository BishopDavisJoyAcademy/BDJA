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
import { Search, BookOpen, Download, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function LibraryPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    resource_type: "pdf",
    file_url: "",
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
      total_copies: parseInt(formData.total_copies),
      available_copies: parseInt(formData.total_copies),
      created_by: user?.id,
    };

    const { error } = await supabase.from("library_resources").insert(payload);
    if (error) { toast.error("Failed to add resource"); return; }
    toast.success("Resource added");
    setIsModalOpen(false);
    setFormData({ title: "", author: "", isbn: "", resource_type: "pdf", file_url: "", total_copies: "1" });
    loadData();
  };

  const filtered = resources.filter((r) =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.author?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bdja-dark">Library</h1>
          <p className="text-gray-500 text-sm mt-1">Digital and physical resources</p>
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Resource
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by title or author..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-400">No resources found.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((res) => (
            <Card key={res.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-bdja-primary" />
                      <h3 className="font-semibold text-bdja-dark text-sm">{res.title}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{res.author || "Unknown author"}</p>
                    <p className="text-xs text-gray-400 mt-1">{res.isbn && `ISBN: ${res.isbn}`}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 uppercase">{res.resource_type}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  {res.resource_type === "physical" ? (
                    <p className="text-xs text-gray-500">{res.available_copies} / {res.total_copies} available</p>
                  ) : (
                    <p className="text-xs text-gray-500">Digital resource</p>
                  )}
                  {res.file_url && (
                    <a href={res.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-bdja-primary hover:underline flex items-center gap-1">
                      <Download className="w-3 h-3" /> Open
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Library Resource">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          <Input placeholder="Author" value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} />
          <Input placeholder="ISBN" value={formData.isbn} onChange={(e) => setFormData({ ...formData, isbn: e.target.value })} />
          <Select value={formData.resource_type} onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}>
            {["pdf", "epub", "audio", "video", "image", "physical"].map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </Select>
          <Input placeholder="File URL (for digital)" value={formData.file_url} onChange={(e) => setFormData({ ...formData, file_url: e.target.value })} />
          <Input type="number" placeholder="Total Copies" value={formData.total_copies} onChange={(e) => setFormData({ ...formData, total_copies: e.target.value })} />
          <Button type="submit" variant="primary" className="w-full">Add Resource</Button>
        </form>
      </Modal>
    </div>
  );
}
