"use client";

import { useRef, useEffect } from "react";
import { Camera, Image, FileText, Mic, PenTool, ScanLine, BarChart3, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  theme: Record<string, unknown>;
}

export function BottomSheet({
  isOpen, onClose, onCamera, onPhotos, onDocuments, onVoice,
  onWhiteboard, onScanner, onPoll, onLink, theme,
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
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={sheetRef}
        className="w-full max-w-md rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300"
        style={{ background: theme.surface }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg" style={{ color: theme.text }}>Add Attachment</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors">
            <X className="w-5 h-5" style={{ color: theme.textMuted }} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); onClose(); }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all hover:scale-105 active:scale-95"
              style={{ background: item.color + "10" }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: item.color + "20" }}
              >
                <item.icon className="w-6 h-6" style={{ color: item.color }} />
              </div>
              <span className="text-xs font-medium" style={{ color: theme.text }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
