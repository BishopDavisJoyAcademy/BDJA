"use client";

import {
  Bot, X, RotateCcw, MessageSquarePlus, Maximize2, Minimize2,
  ChevronLeft, Settings, Search, Download, Keyboard
} from "lucide-react";
import Image from "next/image";
import { ThemeConfig } from "@/lib/joy-themes";
import { cn } from "@/lib/utils";

interface JoyHeaderProps {
  theme: ThemeConfig;
  isFullScreen: boolean;
  showSidebar: boolean;
  showSettings: boolean;
  currentTitle: string;
  onToggle: () => void;
  onToggleFullScreen: () => void;
  onToggleSidebar: () => void;
  onToggleSettings: () => void;
  onNewChat: () => void;
  onExport: () => void;
  onShowShortcuts: () => void;
  onShowSearch: () => void;
}

export function JoyHeader({
  theme,
  isFullScreen,
  showSidebar,
  showSettings,
  currentTitle,
  onToggle,
  onToggleFullScreen,
  onToggleSidebar,
  onToggleSettings,
  onNewChat,
  onExport,
  onShowShortcuts,
  onShowSearch,
}: JoyHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 shrink-0"
      style={{ background: theme.headerGradient }}
    >
      <div className="flex items-center gap-3">
        {showSidebar ? (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center overflow-hidden">
            <Image
              src="/joy-logo.png"
              alt="Joy"
              width={20}
              height={20}
              className="object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <Bot className="w-4 h-4 text-white hidden" />
          </div>
        )}
        <div>
          <h2 className="font-semibold text-sm text-white">Joy AI</h2>
          <p className="text-[10px] text-white/70 truncate max-w-[120px]">
            {currentTitle || "New Chat"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onShowSearch}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          title="Search web & YouTube"
        >
          <Search className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={onNewChat}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          title="New chat (Ctrl+N)"
        >
          <MessageSquarePlus className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={onToggleSidebar}
          className={cn("p-1.5 rounded-lg hover:bg-white/10 transition-colors", showSidebar && "bg-white/15")}
          title="Conversations"
        >
          <RotateCcw className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={onExport}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          title="Export chat"
        >
          <Download className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={onToggleSettings}
          className={cn("p-1.5 rounded-lg hover:bg-white/10 transition-colors", showSettings && "bg-white/15")}
          title="Settings"
        >
          <Settings className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={onShowShortcuts}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          title="Keyboard shortcuts (Ctrl+/)"
        >
          <Keyboard className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={onToggleFullScreen}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          title={isFullScreen ? "Exit fullscreen" : "Fullscreen (Ctrl+F)"}
        >
          {isFullScreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
        </button>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
