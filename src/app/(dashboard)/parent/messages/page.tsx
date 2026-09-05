"use client";

import { useParentContext } from "@/contexts/ParentContext";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { MessageSquare, Loader2, Send, ChevronLeft, User, Clock } from "lucide-react";

const GOLD = "#D4AF37";

interface Teacher { id: string; full_name: string; email: string | null; avatar_url: string | null; subjects: string[]; is_class_teacher: boolean; }
interface Message { id: string; content: string; sent_by: string; created_at: string; read_by_parent: boolean; read_by_teacher: boolean; teacher: { full_name: string; avatar_url: string | null } | null; parent: { full_name: string; avatar_url: string | null } | null; }

export default function ParentMessages() {
  const { selectedChild } = useParentContext();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<"list" | "thread">("list");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTeachers = useCallback(async () => {
    if (!selectedChild) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
      const res = await fetch(`/api/parent/teachers?child_id=${selectedChild.student_id}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch teachers");
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setLoading(false); }
  }, [selectedChild]);

  const fetchMessages = useCallback(async (teacherId: string) => {
    if (!selectedChild) return;
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
      const res = await fetch(`/api/parent/messages?child_id=${selectedChild.student_id}&teacher_id=${teacherId}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); }
  }, [selectedChild]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  useEffect(() => {
    if (selectedTeacher) { fetchMessages(selectedTeacher.id); setView("thread"); }
  }, [selectedTeacher, fetchMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!selectedChild || !selectedTeacher || !newMessage.trim()) return;
    setSending(true);
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
      const res = await fetch("/api/parent/messages", {
        method: "POST", headers, body: JSON.stringify({ child_id: selectedChild.student_id, teacher_id: selectedTeacher.id, content: newMessage.trim() }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      setNewMessage("");
      await fetchMessages(selectedTeacher.id);
      toast.success("Message sent");
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setSending(false); }
  };

  if (!selectedChild) return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <MessageSquare className="w-16 h-16 text-slate-700 mb-4" />
      <h2 className="text-xl font-semibold text-white mb-2">Select a Child</h2>
      <p className="text-slate-400 text-sm">Choose a child to message their teachers.</p>
    </div>
  );

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-white">Message Teacher</h1>
        <p className="text-slate-400 text-sm mt-1">{selectedChild.full_name} · {selectedChild.class_name}</p>
      </div>

      <div className="flex-1 min-h-0 rounded-2xl bg-slate-900/60 border border-slate-700/50 overflow-hidden flex flex-col sm:flex-row">
        {/* Teacher List */}
        <div className={`${view === "thread" ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-72 border-r border-slate-700/50`}>
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Teachers</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} /></div>
            ) : teachers.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-500">No teachers found</p>
              </div>
            ) : (
              teachers.map((t) => (
                <button key={t.id} onClick={() => setSelectedTeacher(t)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedTeacher?.id === t.id ? "bg-[#D4AF37]/10 border border-[#D4AF37]/20" : "hover:bg-slate-800/40 border border-transparent"}`}>
                  <div className="w-9 h-9 rounded-full bg-slate-700/50 flex items-center justify-center shrink-0 overflow-hidden">
                    {t.avatar_url ? <img src={t.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.full_name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{t.subjects.join(", ")}{t.is_class_teacher && " · Class Teacher"}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread */}
        <div className={`${view === "list" ? "hidden sm:flex" : "flex"} flex-col flex-1 min-w-0`}>
          {selectedTeacher ? (
            <>
              <div className="flex items-center gap-3 p-4 border-b border-slate-700/50">
                <button onClick={() => setView("list")} className="sm:hidden p-1.5 rounded-lg hover:bg-slate-800/50 text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
                <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center shrink-0 overflow-hidden">
                  {selectedTeacher.avatar_url ? <img src={selectedTeacher.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{selectedTeacher.full_name}</p>
                  <p className="text-[10px] text-slate-500">{selectedTeacher.subjects.join(", ")}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-10 h-10 text-slate-700 mb-2" />
                    <p className="text-sm text-slate-500">No messages yet</p>
                    <p className="text-xs text-slate-600">Start a conversation with {selectedTeacher.full_name}</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isParent = m.sent_by === "parent";
                    return (
                      <div key={m.id} className={`flex ${isParent ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isParent ? "bg-[#D4AF37]/15 border border-[#D4AF37]/20 rounded-br-md" : "bg-slate-800/60 border border-slate-700/30 rounded-bl-md"}`}>
                          <p className="text-sm text-white">{m.content}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <p className="text-[10px] text-slate-500">{new Date(m.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37]/30"
                  />
                  <button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="p-2.5 rounded-xl transition-all disabled:opacity-40" style={{ background: "#D4AF37", color: "#0f172a" }}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-sm text-slate-500">Select a teacher to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
