"use client";

import Image from "next/image";
import { X, FileText, Image, Video, Music, Link2, BarChart3, PenTool, RotateCcw } from "lucide-react";
import { AttachmentFile } from "@/types/attachments";
import { ThemeConfig } from "@/lib/joy-themes";
import { cn } from "@/lib/utils";

interface AttachmentChipProps {
  attachment: AttachmentFile;
  formatFileSize: (bytes: number) => string;
  onRemove: (id: string) => void;
  onPreview: (attachment: AttachmentFile) => void;
  onUpload?: (id: string) => void;
  theme: ThemeConfig;
}

export function AttachmentChip({ attachment, formatFileSize, onRemove, onPreview, onUpload, theme }: AttachmentChipProps) {
  const getIcon = () => {
    switch (attachment.type) {
      case "image": return <Image className="w-3.5 h-3.5" aria-label="Image attachment" />;
      case "video": return <Video className="w-3.5 h-3.5" />;
      case "audio": return <Music className="w-3.5 h-3.5" />;
      case "link": return <Link2 className="w-3.5 h-3.5" />;
      case "poll": return <BarChart3 className="w-3.5 h-3.5" />;
      case "whiteboard": return <PenTool className="w-3.5 h-3.5" />;
      default: return <FileText className="w-3.5 h-3.5" />;
    }
  };

  const getStatusIcon = () => {
    switch (attachment.status) {
      case "uploading":
        return (
          <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: theme.primary, borderTopColor: "transparent" }} />
        );
      case "success":
        return <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: "#22c55e" }}>
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>;
      case "error":
        return <RotateCcw className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <div className="w-3.5 h-3.5 rounded-full" style={{ background: theme.textMuted + "40" }} />;
    }
  };

  const handleClick = () => {
    if (attachment.status === "error" && onUpload) {
      onUpload(attachment.id);
    } else {
      onPreview(attachment);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition-all hover:scale-[1.02]",
        attachment.status === "error" && onUpload ? "cursor-pointer border-red-300 bg-red-50" : "cursor-pointer"
      )}
      style={{
        background: theme.surface,
        borderColor: attachment.status === "error" ? "#fca5a5" : theme.border,
        color: theme.text,
        maxWidth: "200px",
      }}
      onClick={handleClick}
    >
      {attachment.thumbnail ? (
        <Image src={attachment.thumbnail || ""} alt={attachment.name || "Attachment thumbnail"} width={24} height={24} className="rounded object-cover shrink-0" />
      ) : (
        <span style={{ color: theme.primary }}>{getIcon()}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{attachment.name}</p>
        <div className="flex items-center gap-1.5">
          <span style={{ color: theme.textMuted, fontSize: "10px" }}>{formatFileSize(attachment.size)}</span>
          {getStatusIcon()}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(attachment.id); }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-black/5 transition-all shrink-0"
      >
        <X className="w-3 h-3" style={{ color: theme.textMuted }} />
      </button>
    </div>
  );
}
