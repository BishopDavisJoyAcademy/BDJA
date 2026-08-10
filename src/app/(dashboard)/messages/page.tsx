"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { MessageSquare, Send, Loader2, User } from "lucide-react";

interface Message {
  id: string;
  subject: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  is_read: boolean;
  created_at: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ subject: "", content: "", recipient_id: "" });

  useEffect(() => {
    if (user) fetchMessages();
  }, [user]);

  async function fetchMessages() {
    try {
      setFetching(true);
      const res = await fetch("/api/messages");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.content.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to send");
      setShowForm(false);
      setForm({ subject: "", content: "", recipient_id: "" });
      fetchMessages();
    } catch (err) {
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-500">Communicate with teachers, staff, and parents</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <MessageSquare className="w-4 h-4" /> New Message
        </button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Compose Message</h3>
          <form onSubmit={handleSend} className="space-y-3">
            <input type="text" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="text" value={form.recipient_id} onChange={(e) => setForm({ ...form, recipient_id: e.target.value })} placeholder="Recipient ID (leave blank for broadcast)" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Your message..." rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none" />
            <div className="flex gap-2">
              <button type="submit" disabled={sending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        {fetching ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No messages yet.</div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`p-4 border rounded-lg ${m.is_read ? "border-gray-100 bg-white" : "border-blue-200 bg-blue-50"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{m.subject}</h4>
                      <p className="text-sm text-gray-600 mt-1">{m.content}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatDate(m.created_at)}</p>
                    </div>
                  </div>
                  {!m.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
