"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Compass, Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight,
  Save, X, Loader2, Route, MessageSquare, Lock
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface PageAssistant {
  id: string;
  page_route: string;
  page_name: string;
  context_prompt: string;
  suggested_actions: Array<{ text: string; action: string }>;
  required_permission: string | null;
  is_active: boolean;
  created_at: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function JoyPageAssistantsPage() {
  const [assistants, setAssistants] = useState<PageAssistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<PageAssistant | null>(null);
  const [formData, setFormData] = useState({
    page_route: "",
    page_name: "",
    context_prompt: "",
    suggested_actions: [{ text: "", action: "" }],
    required_permission: "",
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getHeaders = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
    return headers;
  }, []);

  const fetchAssistants = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/joy/page-assistants", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAssistants(json.assistants || []);
    } catch (err) {
      toast.error("Failed to load page assistants");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchAssistants();
  }, [fetchAssistants]);

  const filtered = assistants.filter((a) =>
    a.page_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.page_route.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = useCallback((assistant?: PageAssistant) => {
    if (assistant) {
      setEditingAssistant(assistant);
      setFormData({
        page_route: assistant.page_route,
        page_name: assistant.page_name,
        context_prompt: assistant.context_prompt,
        suggested_actions: assistant.suggested_actions.length > 0 ? assistant.suggested_actions : [{ text: "", action: "" }],
        required_permission: assistant.required_permission || "",
        is_active: assistant.is_active,
      });
    } else {
      setEditingAssistant(null);
      setFormData({
        page_route: "",
        page_name: "",
        context_prompt: "",
        suggested_actions: [{ text: "", action: "" }],
        required_permission: "",
        is_active: true,
      });
    }
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.page_route.trim() || !formData.page_name.trim() || !formData.context_prompt.trim()) {
      toast.error("Route, name, and context prompt are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/joy/page-assistants", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          suggested_actions: formData.suggested_actions.filter((a) => a.text && a.action),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(editingAssistant ? "Assistant updated" : "Assistant created");
      setIsModalOpen(false);
      fetchAssistants();
    } catch (err) {
      toast.error("Failed to save assistant");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingAssistant, getHeaders, fetchAssistants]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this page assistant?")) return;
    try {
      const headers = await getHeaders();
      const url = new URL("/api/joy/page-assistants", window.location.origin);
      url.searchParams.set("id", id);
      const res = await fetch(url.toString(), { method: "DELETE", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Assistant deleted");
      fetchAssistants();
    } catch {
      toast.error("Failed to delete assistant");
    }
  }, [getHeaders, fetchAssistants]);

  const addAction = useCallback(() => {
    setFormData((p) => ({
      ...p,
      suggested_actions: [...p.suggested_actions, { text: "", action: "" }],
    }));
  }, []);

  const removeAction = useCallback((index: number) => {
    setFormData((p) => ({
      ...p,
      suggested_actions: p.suggested_actions.filter((_, i) => i !== index),
    }));
  }, []);

  const updateAction = useCallback((index: number, field: "text" | "action", value: string) => {
    setFormData((p) => ({
      ...p,
      suggested_actions: p.suggested_actions.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    }));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Compass className="w-7 h-7 text-[#D4AF37]" />
                Joy Page Assistants
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                Configure contextual assistance for each dashboard page
              </p>
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-[#D4AF37] hover:bg-[#E8C84A] text-slate-900 font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Assistant
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by page name or route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900/60 border-slate-700/50 text-white placeholder:text-slate-500"
          />
        </div>

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
            <Compass className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No page assistants</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Add assistants to help Joy provide contextual help on each dashboard page.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-4"
          >
            {filtered.map((assistant) => (
              <motion.div
                key={assistant.id}
                variants={itemVariants}
                className={cn(
                  "bg-slate-900/60 border rounded-2xl p-5 transition-colors group",
                  assistant.is_active
                    ? "border-slate-700/50 hover:border-[#D4AF37]/20"
                    : "border-slate-800/50 opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Route className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-sm font-semibold text-white">{assistant.page_name}</span>
                      <code className="text-[10px] text-slate-500 font-mono bg-slate-800/60 px-1.5 py-0.5 rounded">
                        {assistant.page_route}
                      </code>
                      {assistant.required_permission && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Lock className="w-3 h-3" />
                          {assistant.required_permission}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-3">
                      {assistant.context_prompt}
                    </p>
                    {assistant.suggested_actions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {assistant.suggested_actions.map((action) => (
                          <span
                            key={action.action}
                            className="px-2 py-1 rounded-md bg-[#D4AF37]/10 text-[#D4AF37] text-[11px] font-medium border border-[#D4AF37]/20"
                          >
                            {action.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenModal(assistant)}
                      className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-[#D4AF37] transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(assistant.id)}
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAssistant ? "Edit Assistant" : "Add Assistant"}>
        <div className="space-y-4 p-2 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Page Route</label>
            <Input
              value={formData.page_route}
              onChange={(e) => setFormData((p) => ({ ...p, page_route: e.target.value }))}
              placeholder="e.g., /dashboard/timetable"
              disabled={!!editingAssistant}
              className="bg-slate-900/60 border-slate-700/50 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Page Name</label>
            <Input
              value={formData.page_name}
              onChange={(e) => setFormData((p) => ({ ...p, page_name: e.target.value }))}
              placeholder="e.g., Timetable"
              className="bg-slate-900/60 border-slate-700/50 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Context Prompt</label>
            <textarea
              value={formData.context_prompt}
              onChange={(e) => setFormData((p) => ({ ...p, context_prompt: e.target.value }))}
              placeholder="What should Joy know about this page?"
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Required Permission (optional)</label>
            <Input
              value={formData.required_permission}
              onChange={(e) => setFormData((p) => ({ ...p, required_permission: e.target.value }))}
              placeholder="e.g., timetable.manage"
              className="bg-slate-900/60 border-slate-700/50 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Suggested Actions</label>
            <div className="space-y-2">
              {formData.suggested_actions.map((action, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={action.text}
                    onChange={(e) => updateAction(index, "text", e.target.value)}
                    placeholder="Button text"
                    className="flex-1 bg-slate-900/60 border-slate-700/50 text-white text-sm"
                  />
                  <Input
                    value={action.action}
                    onChange={(e) => updateAction(index, "action", e.target.value)}
                    placeholder="Action key"
                    className="w-32 bg-slate-900/60 border-slate-700/50 text-white text-sm"
                  />
                  <button
                    onClick={() => removeAction(index)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={addAction}
              className="mt-2 text-[#D4AF37] text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Action
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-[#D4AF37] focus:ring-[#D4AF37]/30"
            />
            <label htmlFor="is_active" className="text-sm text-slate-400">Active</label>
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
              {editingAssistant ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
