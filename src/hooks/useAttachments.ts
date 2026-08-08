"use client";

import { useState, useCallback, useRef } from "react";
import { AttachmentFile, PollData, WhiteboardData } from "@/types/attachments";

export function useAttachments() {
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileType = (file: File): AttachmentFile["type"] => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "document";
  };

  const createThumbnail = async (file: File): Promise<string | undefined> => {
    if (!file.type.startsWith("image/")) return undefined;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const addFiles = useCallback(async (files: FileList | null, source: "camera" | "photos" | "documents" | "scanner") => {
    if (!files || files.length === 0) return;
    const newAttachments: AttachmentFile[] = [];
    for (const file of Array.from(files)) {
      const id = generateId();
      const thumbnail = await createThumbnail(file);
      newAttachments.push({
        id,
        file,
        name: file.name,
        size: file.size,
        type: getFileType(file),
        status: "pending",
        progress: 0,
        thumbnail,
        dataUrl: thumbnail,
        metadata: { source },
      });
    }
    setAttachments((prev) => [...prev, ...newAttachments]);

    // AUTO-UPLOAD: Start uploading immediately after adding
    setIsUploading(true);
    for (const att of newAttachments) {
      try {
        const formData = new FormData();
        formData.append("file", att.file);
        formData.append("type", att.type);

        setAttachments((prev) =>
          prev.map((a) => (a.id === att.id ? { ...a, status: "uploading", progress: 0 } : a))
        );

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
        const json = await res.json();
        setAttachments((prev) =>
          prev.map((a) => (a.id === att.id ? { ...a, status: "success", progress: 100, url: json.url } : a))
        );
      } catch (err: any) {
        setAttachments((prev) =>
          prev.map((a) => (a.id === att.id ? { ...a, status: "error", errorMessage: err.message } : a))
        );
      }
    }
    setIsUploading(false);
  }, []);

  const addLink = useCallback((url: string, title?: string) => {
    const id = generateId();
    setAttachments((prev) => [
      ...prev,
      {
        id,
        file: new File([], title || url),
        name: title || url,
        size: 0,
        type: "link",
        status: "success",
        progress: 100,
        url,
        metadata: { linkUrl: url },
      },
    ]);
  }, []);

  const addPoll = useCallback((data: PollData) => {
    const id = generateId();
    setAttachments((prev) => [
      ...prev,
      {
        id,
        file: new File([], "poll.json"),
        name: data.question,
        size: 0,
        type: "poll",
        status: "success",
        progress: 100,
        metadata: { pollData: data },
      },
    ]);
  }, []);

  const addWhiteboard = useCallback((data: WhiteboardData, dataUrl?: string) => {
    const id = generateId();
    const finalDataUrl = dataUrl || "";
    setAttachments((prev) => [
      ...prev,
      {
        id,
        file: new File([finalDataUrl], "whiteboard.png"),
        name: "Whiteboard",
        size: finalDataUrl.length,
        type: "whiteboard",
        status: "success",
        progress: 100,
        thumbnail: finalDataUrl || undefined,
        dataUrl: finalDataUrl || undefined,
        metadata: { whiteboardData: data },
      },
    ]);
  }, []);

  const updateAttachment = useCallback((id: string, updates: Partial<AttachmentFile>) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const uploadAttachment = useCallback(async (attachment: AttachmentFile): Promise<string | null> => {
    if (attachment.status === "success" && attachment.url) return attachment.url;
    updateAttachment(attachment.id, { status: "uploading", progress: 0 });

    try {
      const formData = new FormData();
      if (attachment.dataUrl && attachment.type === "whiteboard") {
        const blob = await fetch(attachment.dataUrl).then((r) => r.blob());
        formData.append("file", blob, "whiteboard.png");
      } else {
        formData.append("file", attachment.file);
      }
      formData.append("type", attachment.type);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      updateAttachment(attachment.id, { status: "success", progress: 100, url: json.url });
      return json.url;
    } catch (err: any) {
      updateAttachment(attachment.id, { status: "error", errorMessage: err.message });
      return null;
    }
  }, [updateAttachment]);

  const uploadAll = useCallback(async (): Promise<AttachmentFile[]> => {
    const results = await Promise.all(
      attachments.map(async (a) => {
        if (a.status === "success" && a.url) return a;
        const url = await uploadAttachment(a);
        return { ...a, url: url || undefined };
      })
    );
    return results;
  }, [attachments, uploadAttachment]);

  return {
    attachments,
    showBottomSheet,
    setShowBottomSheet,
    previewAttachment,
    setPreviewAttachment,
    fileInputRef,
    addFiles,
    addLink,
    addPoll,
    addWhiteboard,
    updateAttachment,
    removeAttachment,
    clearAttachments,
    uploadAttachment,
    uploadAll,
    formatFileSize,
    generateId,
    isUploading,
  };
}
