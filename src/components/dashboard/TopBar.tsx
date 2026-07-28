"use client";

import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/hooks/useStore";
import { supabase } from "@/lib/supabase";
import { Bell, Menu, MessageCircle, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export function TopBar() {
  const { user, signOut } = useAuth();
  const { sidebarOpen, setSidebarOpen, setJoyOpen, unreadCount, setUnreadCount } = useAppStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      setNotifications(data || []);
      setUnreadCount(data?.length || 0);
    };
    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev].slice(0, 5));
        setUnreadCount((prev) => prev + 1);
        toast(payload.new.title, { icon: "🔔" });
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user, setUnreadCount]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  if (!mounted || !user) return null;

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-20 xl:left-64 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-4 lg:px-6 transition-all duration-300">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-bdja-dark capitalize">
          {user.role.replace("_", " ")} Portal
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setJoyOpen(true)}
          className="p-2 hover:bg-bdja-secondary/10 rounded-lg transition-colors group"
          title="Ask Joy"
        >
          <Sparkles className="w-5 h-5 text-bdja-secondary group-hover:scale-110 transition-transform" />
        </button>

        <Link href="/messages" className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
          <MessageCircle className="w-5 h-5 text-gray-600" />
        </Link>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-sm">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-400 text-center">No new notifications</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-800">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.content}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 bg-bdja-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-800">{user.full_name}</p>
            <p className="text-[10px] text-gray-400 capitalize">{user.role.replace("_", " ")}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
