"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Clock, BookOpen, Save, CheckCircle } from "lucide-react";
import { extractYouTubeId, getYouTubeEmbedUrl } from "@/lib/vora";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    title: string;
    subject: string;
    grade_level: string;
    summary?: string;
    duration_seconds?: number;
    thumbnail_url?: string;
    youtube_url: string;
    channel?: string;
  } | null;
}

export function VideoPlayerModal({ isOpen, onClose, video }: VideoPlayerModalProps) {
  const [saved, setSaved] = useState(false);
  const [watchStartTime, setWatchStartTime] = useState<number>(0);

  useEffect(() => {
    if (isOpen && video) {
      setWatchStartTime(Date.now());
      setSaved(false);
      // Record engagement start
      fetch("/api/vora/engage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: video.id,
          title: video.title,
          thumbnail_url: video.thumbnail_url,
          subject: video.subject,
          grade_level: video.grade_level,
          duration_seconds: video.duration_seconds,
          youtube_url: video.youtube_url,
          action: "start",
        }),
      }).catch(() => {});
    }
  }, [isOpen, video]);

  const handleClose = useCallback(() => {
    if (video && watchStartTime > 0) {
      const watchDuration = Math.floor((Date.now() - watchStartTime) / 1000);
      fetch("/api/vora/engage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: video.id,
          title: video.title,
          thumbnail_url: video.thumbnail_url,
          subject: video.subject,
          grade_level: video.grade_level,
          duration_seconds: video.duration_seconds,
          youtube_url: video.youtube_url,
          action: "stop",
          watch_duration: watchDuration,
        }),
      }).catch(() => {});
    }
    onClose();
  }, [video, watchStartTime, onClose]);

  async function handleSave() {
    if (!video) return;
    try {
      const res = await fetch("/api/vora/engage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: video.id,
          title: video.title,
          thumbnail_url: video.thumbnail_url,
          subject: video.subject,
          grade_level: video.grade_level,
          duration_seconds: video.duration_seconds,
          youtube_url: video.youtube_url,
          action: "save",
        }),
      });
      if (res.ok) setSaved(true);
    } catch (err) {
      console.error(err);
    }
  }

  if (!isOpen || !video) return null;

  const videoId = extractYouTubeId(video.youtube_url);
  const embedUrl = videoId ? getYouTubeEmbedUrl(videoId) : null;

  function formatDuration(seconds?: number) {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={handleClose}>
      <div className="relative w-full max-w-5xl mx-4 bg-[#0a1628] rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h3 className="text-white font-semibold">{video.title}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-white/50 flex items-center gap-1"><BookOpen className="w-3 h-3" /> {video.subject}</span>
              <span className="text-xs text-white/50 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(video.duration_seconds)}</span>
              <span className="text-xs text-white/50">{video.grade_level}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saved}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${saved ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white hover:bg-white/20"}`}
            >
              {saved ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saved ? "Saved" : "Save"}
            </button>
            <button onClick={handleClose} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video */}
        <div className="aspect-video bg-black">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30">
              <p>Video unavailable</p>
            </div>
          )}
        </div>

        {/* Info */}
        {video.summary && (
          <div className="px-6 py-4 border-t border-white/10">
            <p className="text-sm text-white/70">{video.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
