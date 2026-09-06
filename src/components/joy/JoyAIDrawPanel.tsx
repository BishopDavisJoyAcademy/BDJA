"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Wand2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeConfig } from "@/lib/joy-themes";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export interface AIDrawingStroke {
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
}

export interface AIDrawingResult {
  strokes: AIDrawingStroke[];
  description: string;
}

interface JoyAIDrawPanelProps {
  theme: ThemeConfig;
  onDraw: (strokes: AIDrawingStroke[]) => void;
  onClose: () => void;
  canvasWidth: number;
  canvasHeight: number;
}

export function JoyAIDrawPanel({ theme, onDraw, onClose, canvasWidth, canvasHeight }: JoyAIDrawPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Describe what you want Joy to draw");
      return;
    }
    setGenerating(true);
    try {
      // FIX: Add Authorization header
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/joy/draw", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: prompt.trim(),
          canvasWidth,
          canvasHeight,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate drawing");
      if (data.strokes && data.strokes.length > 0) {
        onDraw(data.strokes);
        toast.success("Drawing generated!");
        onClose();
      } else {
        toast.error("No drawing data received");
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }, [prompt, canvasWidth, canvasHeight, onDraw, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      className="absolute bottom-4 left-4 right-4 z-20 p-4 rounded-2xl border shadow-xl"
      style={{ background: theme.surface, borderColor: theme.border }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4" style={{ color: theme.primary }} />
          <span className="text-sm font-semibold" style={{ color: theme.text }}>
            AI Drawing
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-black/5">
          <X className="w-4 h-4" style={{ color: theme.textMuted }} />
        </button>
      </div>
      <textarea
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. Draw a red circle in the center, a blue triangle at the top, and write 'BDJA' below..."
        rows={3}
        className="w-full px-3 py-2 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 mb-3"
        style={{
          background: theme.background,
          border: `1px solid ${theme.border}`,
          color: theme.text,
          caretColor: theme.primary,
        }}
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-xs"
          style={{ color: theme.textMuted }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="text-xs font-semibold"
          style={{
            background: theme.primary,
            color: "#0f172a",
          }}
        >
          {generating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          )}
          {generating ? "Drawing..." : "Generate"}
        </Button>
      </div>
    </motion.div>
  );
}
