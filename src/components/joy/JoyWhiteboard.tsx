"use client";

import { useRef, useEffect, useState } from "react";
import { PenTool, Eraser, Trash, Undo, X } from "lucide-react";
import { ThemeConfig } from "@/lib/joy-themes";

interface JoyWhiteboardProps {
  isOpen: boolean;
  theme: ThemeConfig;
  onClose: () => void;
  onSave: (dataUrl: string, strokes: any[]) => void;
}

export function JoyWhiteboard({ isOpen, theme, onClose, onSave }: JoyWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [strokes, setStrokes] = useState<Array<{ points: Array<{ x: number; y: number }>; color: string; width: number }>>([]);
  const [currentStroke, setCurrentStroke] = useState<{ points: Array<{ x: number; y: number }>; color: string; width: number } | null>(null);
  const [color, setColor] = useState("#1e3a5f");
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((stroke) => {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      stroke.points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    });
  }, [isOpen, strokes, color, size]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    setCurrentStroke({ points: [pos], color: tool === "eraser" ? "#ffffff" : color, width: size });
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!currentStroke) return;
    const pos = getPos(e);
    const newStroke = { ...currentStroke, points: [...currentStroke.points, pos] };
    setCurrentStroke(newStroke);
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.strokeStyle = newStroke.color;
    ctx.lineWidth = newStroke.width;
    const last = newStroke.points[newStroke.points.length - 2];
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleEnd = () => {
    if (!currentStroke) return;
    setStrokes((prev) => [...prev, currentStroke]);
    setCurrentStroke(null);
  };

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl, strokes);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: theme.background }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4" style={{ color: theme.primary }} />
          <span className="font-medium text-sm" style={{ color: theme.text }}>Whiteboard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={() => setTool("pen")} className="p-1.5 rounded" style={{ background: tool === "pen" ? theme.primary + "20" : "transparent" }}>
              <PenTool className="w-3.5 h-3.5" style={{ color: tool === "pen" ? theme.primary : theme.textMuted }} />
            </button>
            <button onClick={() => setTool("eraser")} className="p-1.5 rounded" style={{ background: tool === "eraser" ? theme.primary + "20" : "transparent" }}>
              <Eraser className="w-3.5 h-3.5" style={{ color: tool === "eraser" ? theme.primary : theme.textMuted }} />
            </button>
          </div>
          <div className="w-px h-5" style={{ background: theme.border }} />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer" />
          <input type="range" min="1" max="20" value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-16" />
          <div className="w-px h-5" style={{ background: theme.border }} />
          <button onClick={handleUndo} className="p-1.5 rounded hover:bg-black/5" title="Undo"><Undo className="w-3.5 h-3.5" style={{ color: theme.textMuted }} /></button>
          <button onClick={handleClear} className="p-1.5 rounded hover:bg-red-50" title="Clear"><Trash className="w-3.5 h-3.5 text-red-500" /></button>
          <button onClick={handleSave} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: theme.primary }}>Save</button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-black/5"><X className="w-4 h-4" style={{ color: theme.textMuted }} /></button>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="w-full h-full rounded-xl border cursor-crosshair touch-none"
          style={{ background: "#ffffff", borderColor: theme.border }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>
    </div>
  );
}
