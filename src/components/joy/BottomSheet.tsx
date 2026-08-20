"use client";

import { useRef, useEffect } from "react";
import { Camera, Image, FileText, Mic, PenTool, ScanLine, BarChart3, Link2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeConfig } from "@/lib/joy-themes";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCamera: () => void;
  onPhotos: () => void;
  onDocuments: () => void;
  onVoice: () => void;
  onWhiteboard: () => void;
  onScanner: () => void;
  onPoll: () => void;
  onLink: () => void;
  onSearch: () => void;
  theme: ThemeConfig;
}

export function BottomSheet({
  isOpen, onClose, onCamera, onPhotos, onDocuments, onVoice,
  onWhiteboard, onScanner, onPoll, onLink, onSearch, theme,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  const items = [
    { icon: Camera, label: "Camera", color: "#ef4444", onClick: onCamera },
    { icon: Image, label: "Photos", color: "#8b5cf6", onClick: onPhotos },
    { icon: FileText, label: "Documents", color: "#3b82f6", onClick: onDocuments },
    { icon: Mic, label: "Voice", color: "#f59e0b", onClick: onVoice },
    { icon: PenTool, label: "Whiteboard", color: "#10b981", onClick: onWhiteboard },
    { icon: ScanLine, label: "Scanner", color: "#ec4899", onClick: onScanner },
    { icon: BarChart3, label: "Poll", color: "#06b6d4", onClick: onPoll },
    { icon: Link2, label: "Link", color: "#6366f1", onClick: onLink },
    { icon: Search, label: "Search", color: "#f97316", onClick: onSearch },
  ];

  if (!isOpen) return null;

  return (
    <div
      ref={sheetRef}
      className="absolute bottom-full left-0 right-0 mb-2 z-30 rounded-2xl border shadow-xl animate-in slide-in-from-bottom-2 duration-200"
      style={{ background: theme.surface, borderColor: theme.border, boxShadow: theme.shadow }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <h3 className="font-semibold text-sm" style={{ color: theme.text }}>Add Attachment</h3>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 transition-colors">
          <X className="w-4 h-4" style={{ color: theme.textMuted }} />
        </button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-4">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => { item.onClick(); onClose(); }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:scale-105 active:scale-95"
            style={{ background: item.color + "10" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: item.color + "20" }}
            >
              <item.icon className="w-5 h-5" style={{ color: item.color }} />
            </div>
            <span className="text-[10px] font-medium" style={{ color: theme.text }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
