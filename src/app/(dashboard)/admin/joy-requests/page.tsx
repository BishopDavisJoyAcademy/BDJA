"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Inbox, Search, Filter, Clock, CheckCircle, XCircle,
  MessageCircle, Send, Loader2, AlertTriangle, User,
  ChevronDown, ChevronUp, Sparkles
} from "lucide-react";
import { useJoyAdminRequests } from "@/hooks/useJoyAdminRequests";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { key: "", label: "All", color: "text-slate-400" },
  { key: "pending", label: "Pending", color: "text-amber-400" },
  { key: "in_review", label: "In Review", color: "text-blue-400" },
  { key: "answered", label: "Answered", color: "text-emerald-400" },
  { key: "dismissed", label: "Dismissed", color: "text-slate-500" },
];

const PRIORITY_BADGES: Record<string, string> = {
  low: "bg-slate-700/50 text-slate-400",
  normal: "bg-blue-500/10 text-blue-400",
  high: "bg-amber-500/10 text-amber-400",
  urgent: "bg-red-500/10 text-red-400",
};

const CATEGORY_ICONS: Record<string, string> = {
  general: "💬",
  fees: "💰",
  policies: "📋",
  calendar: "📅",
  academic: "📚",
  technical: "🔧",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function JoyAdminRequestsPage() {
  const { requests, loading, fetchRequests, respondToRequest } = useJoyAdminRequests();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests(statusFilter || undefined);
  }, [statusFilter, fetchRequests]);

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const handleRespond = useCallback(async () => {
    if (!respondingTo || !responseText.trim()) return;
    setIsSubmitting(true);
    const success = await respondToRequest(respondingTo, responseText);
    setIsSubmitting(false);
    if (success) {
      setIsRespondModalOpen(false);
      setResponseText("");
      setRespondingTo(null);
      fetchRequests(statusFilter || undefined);
    }
  }, [respondingTo, responseText, respondToRequest, fetchRequests, statusFilter]);

  const handleDismiss = useCallback(async (id: string) => {
    const success = await respondToRequest(id, "Request dismissed by admin.", "dismissed");
    if (success) fetchRequests(statusFilter || undefined);
  }, [respondToRequest, fetchRequests, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Inbox className="w-7 h-7 text-[#D4AF37]" />
                Joy Request Inbox
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-sm font-semibold border border-red-500/30">
                    {pendingCount} pending
                  </span>
                )}
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                Questions Joy couldn't answer — respond to help users and train Joy
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900/60 border-slate-700/50 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key === statusFilter ? "" : filter.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  statusFilter === filter.key
                    ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                    : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700/60"
                )}
              >
                {filter.label}
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
            <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">
              {statusFilter ? `No ${statusFilter} requests` : "No requests yet"}
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              When Joy can't answer a question, users can send a request here.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {filtered.map((request) => (
              <motion.div
                key={request.id}
                variants={itemVariants}
                className={cn(
                  "bg-slate-900/60 border rounded-2xl overflow-hidden transition-all",
                  request.status === "pending"
                    ? "border-amber-500/20"
                    : request.status === "answered"
                    ? "border-emerald-500/10"
                    : "border-slate-700/50"
                )}
              >
                {/* Card Header */}
                <button
                  onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center text-lg shrink-0">
                    {CATEGORY_ICONS[request.category] || "💬"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {request.question}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {request.user_name}
                      </span>
                      <span className="capitalize">{request.user_category}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold border", PRIORITY_BADGES[request.priority])}>
                      {request.priority}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-semibold border capitalize",
                      request.status === "pending" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                      request.status === "in_review" && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                      request.status === "answered" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                      request.status === "dismissed" && "bg-slate-700/50 text-slate-500 border-slate-600/30"
                    )}>
                      {request.status.replace("_", " ")}
                    </span>
                    {expandedId === request.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedId === request.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-2 border-t border-slate-700/30">
                        {request.context && (
                          <div className="mb-4">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Context</p>
                            <p className="text-sm text-slate-400 bg-slate-800/40 rounded-lg p-3">{request.context}</p>
                          </div>
                        )}

                        {request.admin_response && (
                          <div className="mb-4">
                            <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-medium mb-1">Admin Response</p>
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                              <p className="text-sm text-slate-300">{request.admin_response}</p>
                              {request.responded_by && (
                                <p className="text-xs text-slate-500 mt-2">
                                  By {request.responded_by.full_name} on {new Date(request.responded_at || "").toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {request.status === "pending" || request.status === "in_review" ? (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setRespondingTo(request.id);
                                setIsRespondModalOpen(true);
                              }}
                              className="bg-[#D4AF37] hover:bg-[#E8C84A] text-slate-900 font-semibold"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Respond
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleDismiss(request.id)}
                              className="text-slate-500 hover:text-red-400"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Dismiss
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Respond Modal */}
      <Modal isOpen={isRespondModalOpen} onClose={() => setIsRespondModalOpen(false)} title="Respond to Request">
        <div className="space-y-4 p-2">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Your Response</label>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Type your response here. This will be sent to the user and can be used to train Joy."
              rows={6}
              className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 placeholder:text-slate-600"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsRespondModalOpen(false)} className="text-slate-400">
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleRespond}
              disabled={isSubmitting || !responseText.trim()}
              className="bg-[#D4AF37] hover:bg-[#E8C84A] text-slate-900 font-semibold"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Response
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
