"use client";

import NextImage from "next/image";
import { useState } from "react";
import { X, FileText, Image, Video, Music, Link2, BarChart3, PenTool, ExternalLink } from "lucide-react";
import { AttachmentFile, PollOption } from "@/types/attachments";
import { ThemeConfig } from "@/lib/joy-themes";
import { ImageEditor } from "./ImageEditor";
import { cn } from "@/lib/utils";

interface AttachmentPreviewProps {
  attachment: AttachmentFile;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<AttachmentFile>) => void;
  theme: ThemeConfig;
}

export function AttachmentPreview({ attachment, onClose, onUpdate, theme }: AttachmentPreviewProps) {
  const [showEditor, setShowEditor] = useState(false);

  const renderContent = () => {
    switch (attachment.type) {
      case "image":
      case "whiteboard":
        return (
          <div className="flex flex-col items-center gap-4">
                        <Image
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
        if (attachment.dataUrl?.startsWith("data:text") || attachment.name.endsWith(".txt")) {
          return (
            <div className="w-full max-w-2xl mx-auto">
              <pre
                className="p-4 rounded-xl text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap"
                style={{ background: theme.codeBg, color: theme.textInverse }}
              >
                {attachment.dataUrl?.split(",")[1] ? atob(attachment.dataUrl.split(",")[1]) : "Preview not available"}
              </pre>
            </div>
          );
        }
        return (
          <div className="flex flex-col items-center gap-4 p-8">
            <FileText className="w-16 h-16" style={{ color: theme.primary }} />
            <p className="text-sm" style={{ color: theme.text }}>{attachment.name}</p>
            <p className="text-xs" style={{ color: theme.textMuted }}>Document preview not available. Download to view.</p>
          </div>
        );

      case "link":
        return (
          <div className="flex flex-col items-center gap-4 p-8">
            <Link2 className="w-16 h-16" style={{ color: theme.primary }} />
            <p className="text-sm font-medium" style={{ color: theme.text }}>{attachment.name}</p>
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white transition-colors hover:opacity-90"
              style={{ background: theme.primary }}
            >
              <ExternalLink className="w-4 h-4" />
              Open Link
            </a>
          </div>
        );

      case "poll":
        const pollData = attachment.metadata?.pollData;
        return (
          <div className="w-full max-w-md mx-auto p-6 rounded-2xl" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5" style={{ color: theme.primary }} />
              <h3 className="font-semibold" style={{ color: theme.text }}>{pollData?.question || "Poll"}</h3>
            </div>
            <div className="space-y-2">
              {pollData?.options?.map((opt: PollOption) => (
                <div
                  key={opt.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                  style={{ borderColor: theme.border, background: theme.background }}
                >
                  <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: theme.primary }} />
                  <span className="text-sm" style={{ color: theme.text }}>{opt.label}</span>
                  <span className="text-xs ml-auto" style={{ color: theme.textMuted }}>{opt.votes} votes</span>
                </div>
              ))}
            </div>
          </div>
        );

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
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]" style={{ background: theme.surface }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-2">
              {attachment.type === "image" && <Image className="w-4 h-4" style={{ color: theme.primary }} aria-label="Image" />}
              {attachment.type === "video" && <Video className="w-4 h-4" style={{ color: theme.primary }} />}
              {attachment.type === "audio" && <Music className="w-4 h-4" style={{ color: theme.primary }} />}
              {attachment.type === "document" && <FileText className="w-4 h-4" style={{ color: theme.primary }} />}
              {attachment.type === "link" && <Link2 className="w-4 h-4" style={{ color: theme.primary }} />}
              {attachment.type === "poll" && <BarChart3 className="w-4 h-4" style={{ color: theme.primary }} />}
              {attachment.type === "whiteboard" && <PenTool className="w-4 h-4" style={{ color: theme.primary }} />}
              <span className="font-medium text-sm" style={{ color: theme.text }}>{attachment.name}</span>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 transition-colors">
              <X className="w-4 h-4" style={{ color: theme.textMuted }} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            {renderContent()}
          </div>
        </div>
      </div>

      {showEditor && attachment.type === "image" && (
        <ImageEditor
          src={attachment.dataUrl || attachment.thumbnail || attachment.url || ""}
          onSave={(dataUrl) => {
            onUpdate(attachment.id, { dataUrl, thumbnail: dataUrl });
            setShowEditor(false);
          }}
          onClose={() => setShowEditor(false)}
          theme={theme}
        />
      )}
    </>
  );
}
