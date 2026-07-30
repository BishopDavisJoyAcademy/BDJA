"use client";

import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/hooks/useStore";
import { Menu, Bell, Sparkles } from "lucide-react";

export function TopBar() {
  const { user } = useAuth();
  const { sidebarOpen, setSidebarOpen, setJoyOpen, unreadCount } = useAppStore();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg md:hidden">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-sm font-medium text-gray-600 hidden sm:block">{user?.role?.replace("_", " ").toUpperCase()}</h2>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setJoyOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg relative" aria-label="Open Joy AI">
          <Sparkles className="w-5 h-5 text-bdja-secondary" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-lg relative" aria-label="Notifications">
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-bdja-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
            {user?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.full_name}</span>
        </div>
      </div>
    </header>
  );
}
