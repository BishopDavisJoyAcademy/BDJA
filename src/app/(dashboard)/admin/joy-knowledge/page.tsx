"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  BookOpen, Plus, Pencil, Trash2, Search, Filter,
  Save, X, BookMarked, Shield, Loader2, Sparkles
} from "lucide-react";
import { useJoyKnowledge } from "@/hooks/useJoyKnowledge";
import { JoyKnowledgeBase } from "@/types/joy";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "motto", label: "Motto", icon: BookMarked },
  { key: "vision", label: "Vision", icon: Sparkles },
  { key: "mission", label: "Mission", icon: Shield },
  { key: "policies", label: "Policies", icon: BookOpen },
  { key: "fees", label: "Fees", icon: BookOpen },
  { key: "calendar", label: "Calendar", icon: BookOpen },
  { key: "contacts", label: "Contacts", icon: BookOpen },
  { key: "procedures", label: "Procedures", icon: BookOpen },
  { key: "rules", label: "Rules", icon: BookOpen },
  { key: "general", label: "General", icon: BookOpen },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function JoyKnowledgeManagerPage() {
  const { knowledge, loading, fetchKnowledge, saveKnowledge, deleteKnowledge } = useJoyKnowledge();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JoyKnowledgeBase | null>(null);
  const [formData, setFormData] = useState({
    key: "",
    content: "",
    category: "general" as const,
    is_public: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  const filtered = knowledge.filter((k) => {
    const matchesSearch =
      k.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? k.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleOpenModal = useCallback((entry?: JoyKnowledgeBase) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        key: entry.key,
        content: entry.content,
        category: entry.category as typeof formData.category,
        is_public: entry.is_public,
      });
    } else {
      setEditingEntry(null);
      setFormData({ key: "", content: "", category: "general", is_public: true });
    }
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.key.trim() || !formData.content.trim()) {
      toast.error("Key and content are required");
      return;
    }
    setIsSubmitting(true);
    await saveKnowledge(formData);
    setIsSubmitting(false);
    setIsModalOpen(false);
    fetchKnowledge();
  }, [formData, saveKnowledge, fetchKnowledge]);

  const handleDelete = useCallback(async (key: string) => {
    if (!confirm(`Delete "${key}"? This cannot be undone.`)) return;
    const success = await deleteKnowledge(key);
    if (success) fetchKnowledge();
  }, [deleteKnowledge, fetchKnowledge]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <BookOpen className="w-7 h-7 text-[#D4AF37]" />
                Joy Knowledge Base
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                Manage what Joy knows about Bishop Davis Joy Academy
              </p>
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-[#D4AF37] hover:bg-[#E8C84A] text-slate-900 font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search knowledge entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900/60 border-slate-700/50 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <button
              onClick={() => setSelectedCategory("")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                selectedCategory === ""
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                  : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700/60"
              )}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key === selectedCategory ? "" : cat.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  selectedCategory === cat.key
                    ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                    : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700/60"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-700/30"
          >
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No entries found</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              {searchQuery || selectedCategory
                ? "Try adjusting your search or filters"
                : "Joy doesn't know anything about the school yet. Add your first entry to get started."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-4"
          >
            {filtered.map((entry) => (
              <motion.div
                key={entry.id}
                variants={itemVariants}
                className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 hover:border-[#D4AF37]/20 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-semibold uppercase tracking-wider border border-[#D4AF37]/20">
                        {entry.category}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{entry.key}</span>
                      {!entry.is_public && (
                        <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-semibold border border-red-500/20">
                          Private
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                      Updated {new Date(entry.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenModal(entry)}
                      className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-[#D4AF37] transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.key)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEntry ? "Edit Entry" : "Add Entry"}>
        <div className="space-y-4 p-2">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Key (unique identifier)</label>
            <Input
              value={formData.key}
              onChange={(e) => setFormData((p) => ({ ...p, key: e.target.value }))}
              placeholder="e.g., school_motto, fee_structure"
              disabled={!!editingEntry}
              className="bg-slate-900/60 border-slate-700/50 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value as typeof formData.category }))}
              className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData((p) => ({ ...p, content: e.target.value }))}
              placeholder="What should Joy know about this?"
              rows={6}
              className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 placeholder:text-slate-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData((p) => ({ ...p, is_public: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-[#D4AF37] focus:ring-[#D4AF37]/30"
            />
            <label htmlFor="is_public" className="text-sm text-slate-400">Public (visible to all users)</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-slate-400">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-[#D4AF37] hover:bg-[#E8C84A] text-slate-900 font-semibold"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {editingEntry ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
