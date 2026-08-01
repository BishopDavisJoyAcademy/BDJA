"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Send, MessageCircle, User } from "lucide-react";
import toast from "react-hot-toast";

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadContacts();
  }, [user]);

  useEffect(() => {
    if (selectedContact) loadMessages();
  }, [selectedContact]);

  const loadContacts = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, role").neq("id", user!.id).order("full_name");
    setContacts(data || []);
    if (data && data.length > 0) setSelectedContact(data[0]);
  };

  const loadMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${user!.id})`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user!.id,
      receiver_id: selectedContact.id,
      content: newMessage.trim(),
    });
    if (error) { toast.error("Failed to send"); return; }
    setNewMessage("");
    loadMessages();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-bdja-dark">Messages</h1>
        <p className="text-gray-500 text-sm mt-1">Direct messaging with teachers, parents, and staff</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        {/* Contacts */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm">Contacts</h3>
            </div>
            <div className="overflow-y-auto max-h-full">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${selectedContact?.id === c.id ? "bg-bdja-primary/5 border-l-4 border-bdja-primary" : "border-l-4 border-transparent"}`}
                >
                  <div className="w-8 h-8 bg-bdja-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.full_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{c.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          {selectedContact && (
            <>
              <div className="p-3 border-b border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-bdja-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedContact.full_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{selectedContact.role}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    <MessageCircle className="w-8 h-8 mb-2" />
                    <p>Start a conversation</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${msg.sender_id === user?.id ? "bg-bdja-primary text-white rounded-br-none" : "bg-gray-100 text-gray-800 rounded-bl-none"}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-gray-100">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button variant="primary" size="sm" onClick={sendMessage}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
