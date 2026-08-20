"use client";

import NextImage from "next/image";
import { useState } from "react";
import {
  X, FileText, Image, Video, Music, Link2, BarChart3, PenTool,
  ExternalLink, Search, Loader2
} from "lucide-react";
import { AttachmentFile, PollOption, PollAttachmentMetadata, SearchAttachmentMetadata, WhiteboardAttachmentMetadata, LinkAttachmentMetadata } from "@/types/attachments";
import { ThemeConfig } from "@/lib/joy-themes";
import { ImageEditor } from "./ImageEditor";
import { cn } from "@/lib/utils";

interface AttachmentPreviewProps {
  attachment: AttachmentFile;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<AttachmentFile>) => void;
  theme: ThemeConfig;
}

function isPollMetadata(meta: unknown): meta is PollAttachmentMetadata {
  if (typeof meta !== "object" || meta === null) return false;
  const m = meta as Record<string, unknown>;
  const pollData = m.pollData;
  if (typeof pollData !== "object" || pollData === null) return false;
  const pd = pollData as Record<string, unknown>;
  return typeof pd.question === "string" && Array.isArray(pd.options);
}

function isSearchMetadata(meta: unknown): meta is SearchAttachmentMetadata {
  if (typeof meta !== "object" || meta === null) return false;
  const m = meta as Record<string, unknown>;
  const searchData = m.searchData;
  if (typeof searchData !== "object" || searchData === null) return false;
  const sd = searchData as Record<string, unknown>;
  return typeof sd.query === "string" && typeof sd.source === "string";
}

function isWhiteboardMetadata(meta: unknown): meta is WhiteboardAttachmentMetadata {
  if (typeof meta !== "object" || meta === null) return false;
  const m = meta as Record<string, unknown>;
  return typeof m.whiteboardData === "object" && m.whiteboardData !== null;
}

function isLinkMetadata(meta: unknown): meta is LinkAttachmentMetadata {
  if (typeof meta !== "object" || meta === null) return false;
  const m = meta as Record<string, unknown>;
  return typeof m.linkUrl === "string";
}

export function AttachmentPreview({ attachment, onClose, onUpdate, theme }: AttachmentPreviewProps) {
  const [showEditor, setShowEditor] = useState(false);

  const renderContent = () => {
    switch (attachment.type) {
      case "image":
      case "whiteboard":
        return (
          <div className="flex flex-col items-center gap-4">
            <NextImage
              src={attachment.dataUrl || attachment.thumbnail || attachment.url || ""}
              alt={attachment.name}
              width={400}
              height={300}
              unoptimized
              className="max-w-full max-h-[60vh] rounded-xl shadow-lg object-contain"
            />
            <button
              onClick={() => setShowEditor(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ background: theme.primary }}
            >
              Open Editor
            </button>
          </div>
        );

      case "video":
        return (
          <video
            src={attachment.dataUrl || attachment.url}
            controls
            className="max-w-full max-h-[60vh] rounded-xl shadow-lg"
          />
        );

      case "audio":
        return (
          <div className="flex flex-col items-center gap-4 p-8">
            <Music className="w-16 h-16" style={{ color: theme.primary }} />
            <audio src={attachment.dataUrl || attachment.url} controls className="w-full max-w-md" />
            <p className="text-sm" style={{ color: theme.text }}>{attachment.name}</p>
          </div>
        );

      case "document":
        if (attachment.extractedContent) {
          return (
            <div className="w-full max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5" style={{ color: theme.primary }} />
                <span className="font-medium" style={{ color: theme.text }}>{attachment.name}</span>
              </div>
              <pre
                className="p-4 rounded-xl text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap"
                style={{ background: theme.codeBg, color: theme.textInverse }}
              >
                {attachment.extractedContent}
              </pre>
            </div>
          );
        }
        return (
          <div className="flex flex-col items-center gap-4 p-8">
            <FileText className="w-16 h-16" style={{ color: theme.primary }} />
            <p className="text-sm" style={{ color: theme.text }}>{attachment.name}</p>
            {attachment.status === "extracting" && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: theme.primary }} />
                <span className="text-sm" style={{ color: theme.textMuted }}>Extracting content...</span>
              </div>
            )}
          </div>
        );

      case "link": {
        const linkMeta = isLinkMetadata(attachment.metadata) ? attachment.metadata : null;
        const url = linkMeta?.linkUrl || attachment.url || "";
        return (
          <div className="flex flex-col items-center gap-4 p-8">
            <Link2 className="w-16 h-16" style={{ color: theme.primary }} />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline flex items-center gap-1"
              style={{ color: theme.primary }}
            >
              {attachment.name} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        );
      }

      case "poll": {
        const pollMeta = isPollMetadata(attachment.metadata) ? attachment.metadata : null;
        if (!pollMeta) return null;
        const pollData = pollMeta.pollData;
        return (
          <div className="w-full max-w-md mx-auto p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5" style={{ color: theme.primary }} />
              <h3 className="font-semibold" style={{ color: theme.text }}>{pollData.question}</h3>
            </div>
            <div className="space-y-2">
              {pollData.options.map((opt: PollOption) => (
                <button
                  key={opt.id}
                  className="w-full text-left px-4 py-2.5 rounded-lg border transition-colors hover:opacity-80"
                  style={{ borderColor: theme.border, background: theme.surface, color: theme.text }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case "search": {
        const searchMeta = isSearchMetadata(attachment.metadata) ? attachment.metadata : null;
        if (!searchMeta) return null;
        const searchData = searchMeta.searchData;
        return (
          <div className="w-full max-w-md mx-auto p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5" style={{ color: theme.primary }} />
              <span className="font-semibold" style={{ color: theme.text }}>Search: {searchData.query}</span>
            </div>
            <p className="text-sm" style={{ color: theme.textMuted }}>Source: {searchData.source}</p>
          </div>
        );
      }

      default:
        return (
          <div className="flex flex-col items-center gap-4 p-8">
            <FileText className="w-16 h-16" style={{ color: theme.primary }} />
            <p className="text-sm" style={{ color: theme.text }}>{attachment.name}</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: theme.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.border }}>
          <h3 className="font-medium text-sm truncate pr-4" style={{ color: theme.text }}>{attachment.name}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 transition-colors">
            <X className="w-4 h-4" style={{ color: theme.textMuted }} />
          </button>
        </div>
        <div className="p-4">{renderContent()}</div>
      </div>
      {showEditor && attachment.type === "image" && (
        <ImageEditor
          imageUrl={attachment.dataUrl || attachment.thumbnail || ""}
          onClose={() => setShowEditor(false)}
          onSave={(dataUrl) => { onUpdate(attachment.id, { dataUrl, thumbnail: dataUrl }); setShowEditor(false); }}
          theme={theme}
        />
      )}
    </div>
  );
}
