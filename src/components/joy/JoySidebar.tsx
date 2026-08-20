"use client";

import { Pin, Trash2, MessageCircle } from "lucide-react";
import { JoyConversation } from "@/types/joy";
import { ThemeConfig } from "@/lib/joy-themes";
import { cn } from "@/lib/utils";

interface JoySidebarProps {
  conversations: JoyConversation[];
  currentId: string | null;
  theme: ThemeConfig;
  onSelect: (conv: JoyConversation) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}

export function JoySidebar({
  conversations,
  currentId,
  theme,
  onSelect,
  onDelete,
  onPin,
}: JoySidebarProps) {
  const sorted = [...conversations].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return (
    <div className="absolute left-0 top-[57px] bottom-0 w-64 z-20 flex flex-col border-r"
      style={{ background: theme.surface, borderColor: theme.border }}
    >
      <div className="p-3 border-b" style={{ borderColor: theme.border }}>
        <h3 className="font-semibold text-xs" style={{ color: theme.text }}>Conversations</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sorted.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all group",
              currentId === conv.id ? "font-medium" : "hover:bg-black/5"
            )}
            style={{
              background: currentId === conv.id ? theme.primary + "15" : "transparent",
              color: currentId === conv.id ? theme.primary : theme.text,
            }}
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" style={{ color: currentId === conv.id ? theme.primary : theme.textMuted }} />
            <span className="flex-1 truncate">{conv.title}</span>
            {conv.is_pinned && <Pin className="w-3 h-3 shrink-0" style={{ color: theme.accent }} />}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onPin(conv.id, !conv.is_pinned); }}
                className="p-1 rounded hover:bg-black/5"
                title={conv.is_pinned ? "Unpin" : "Pin"}
              >
                <Pin className={cn("w-3 h-3", conv.is_pinned ? "fill-current" : "")} style={{ color: theme.textMuted }} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                className="p-1 rounded hover:bg-red-50"
                title="Delete"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </div>
          </button>
        ))}
        {conversations.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: theme.textMuted }}>
            No conversations yet
          </p>
        )}
      </div>
    </div>
  );
}
