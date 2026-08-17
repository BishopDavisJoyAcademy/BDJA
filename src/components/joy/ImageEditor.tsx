"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  RotateCw, FlipHorizontal, FlipVertical, Crop, Type, Pencil,
  Undo2, Download, X, Sun, Contrast, Droplets, Palette, Sparkles,
  Minus, Plus, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeConfig } from "@/lib/joy-themes";

interface ImageEditorProps {
  src: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
  theme: ThemeConfig;
}

export function ImageEditor({ src, onSave, onClose, theme }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [activeTool, setActiveTool] = useState<"adjust" | "crop" | "draw" | "text">("adjust");
  const [drawColor, setDrawColor] = useState("#1e3a5f");
  const [drawSize, setDrawSize] = useState(3);
  const [drawOpacity, setDrawOpacity] = useState(100);
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#1e3a5f");
  const [textSize, setTextSize] = useState(24);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [filter, setFilter] = useState<string>("none");
  const [showFilters, setShowFilters] = useState(false);

  const filters = [
    { name: "None", value: "none", icon: Sun },
    { name: "Grayscale", value: "grayscale(100%)", icon: Contrast },
    { name: "Sepia", value: "sepia(100%)", icon: Palette },
    { name: "Invert", value: "invert(100%)", icon: Sparkles },
    { name: "Warm", value: "sepia(30%) saturate(140%)", icon: Sun },
    { name: "Cool", value: "hue-rotate(180deg) saturate(80%)", icon: Droplets },
    { name: "Vivid", value: "saturate(200%) contrast(110%)", icon: Sparkles },
    { name: "Vintage", value: "sepia(50%) contrast(85%) brightness(90%)", icon: Palette },
  ];

  // Load image into canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      setHistory([dataUrl]);
      setHistoryIndex(0);
    };
    img.src = src;
  }, [src]);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(dataUrl);
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[newIndex];
  }, [history, historyIndex]);

  const applyAdjustments = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || historyIndex < 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${filter}`;
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";
      saveToHistory();
    };
    img.src = history[historyIndex];
  }, [brightness, contrast, saturation, filter, history, historyIndex, saveToHistory]);

  const rotate = useCallback((deg: number) => {
    const canvas = canvasRef.current;
    if (!canvas || historyIndex < 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const newCanvas = document.createElement("canvas");
      newCanvas.width = img.height;
      newCanvas.height = img.width;
      const newCtx = newCanvas.getContext("2d");
      if (!newCtx) return;
      newCtx.translate(newCanvas.width / 2, newCanvas.height / 2);
      newCtx.rotate((deg * Math.PI) / 180);
      newCtx.drawImage(img, -img.width / 2, -img.height / 2);
      canvas.width = newCanvas.width;
      canvas.height = newCanvas.height;
      ctx.drawImage(newCanvas, 0, 0);
      saveToHistory();
    };
    img.src = history[historyIndex];
  }, [history, historyIndex, saveToHistory]);

  const flip = useCallback((axis: "h" | "v") => {
    const canvas = canvasRef.current;
    if (!canvas || historyIndex < 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      if (axis === "h") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
      }
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      saveToHistory();
    };
    img.src = history[historyIndex];
  }, [history, historyIndex, saveToHistory]);

  const handleDrawStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "draw") return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleDrawMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawSize;
    ctx.globalAlpha = drawOpacity / 100;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const handleDrawEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveToHistory();
  };

  const addText = useCallback(() => {
    if (!textInput.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas || historyIndex < 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.font = `${textSize}px sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.fillText(textInput, canvas.width / 2, canvas.height / 2);
    setTextInput("");
    saveToHistory();
  }, [textInput, textColor, textSize, history, historyIndex, saveToHistory]);

  const applyCrop = useCallback(() => {
    if (!cropStart || !cropEnd) return;
    const canvas = canvasRef.current;
    if (!canvas || historyIndex < 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const x = Math.min(cropStart.x, cropEnd.x);
      const y = Math.min(cropStart.y, cropEnd.y);
      const w = Math.abs(cropEnd.x - cropStart.x);
      const h = Math.abs(cropEnd.y - cropStart.y);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      saveToHistory();
      setCropStart(null);
      setCropEnd(null);
    };
    img.src = history[historyIndex];
  }, [cropStart, cropEnd, history, historyIndex, saveToHistory]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `joy-edited-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  }, [onSave]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]" style={{ background: theme.surface }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-1">
            {[
              { id: "adjust", icon: Sun, label: "Adjust" },
              { id: "crop", icon: Crop, label: "Crop" },
              { id: "draw", icon: Pencil, label: "Draw" },
              { id: "text", icon: Type, label: "Text" },
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as "adjust" | "crop" | "draw" | "text")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  activeTool === tool.id ? "" : "hover:bg-black/5"
                )}
                style={{
                  background: activeTool === tool.id ? theme.primary + "15" : "transparent",
                  color: activeTool === tool.id ? theme.primary : theme.text,
                }}
              >
                <tool.icon className="w-3.5 h-3.5" />
                {tool.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded-lg hover:bg-black/5 disabled:opacity-30 transition-colors" title="Undo">
              <Undo2 className="w-4 h-4" style={{ color: theme.text }} />
            </button>
            <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-black/5 transition-colors" title="Download">
              <Download className="w-4 h-4" style={{ color: theme.text }} />
            </button>
            <button onClick={handleSave} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors hover:opacity-90" style={{ background: theme.primary }}>
              Apply
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 transition-colors">
              <X className="w-4 h-4" style={{ color: theme.textMuted }} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto" style={{ background: theme.background }}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleDrawStart}
              onMouseMove={handleDrawMove}
              onMouseUp={handleDrawEnd}
              onMouseLeave={handleDrawEnd}
              className={cn("max-w-full max-h-full shadow-lg rounded-lg", activeTool === "draw" && "cursor-crosshair")}
            />
          </div>

          {/* Sidebar */}
          <div className="w-64 border-l p-4 overflow-y-auto" style={{ borderColor: theme.border, background: theme.surface }}>
            {activeTool === "adjust" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: theme.text }}>
                    <Sun className="w-3.5 h-3.5" /> Brightness
                  </label>
                  <input
                    type="range" min="0" max="200" value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    onMouseUp={applyAdjustments}
                    className="w-full accent-current"
                    style={{ accentColor: theme.primary }}
                  />
                  <span className="text-xs" style={{ color: theme.textMuted }}>{brightness}%</span>
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: theme.text }}>
                    <Contrast className="w-3.5 h-3.5" /> Contrast
                  </label>
                  <input
                    type="range" min="0" max="200" value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    onMouseUp={applyAdjustments}
                    className="w-full"
                    style={{ accentColor: theme.primary }}
                  />
                  <span className="text-xs" style={{ color: theme.textMuted }}>{contrast}%</span>
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: theme.text }}>
                    <Droplets className="w-3.5 h-3.5" /> Saturation
                  </label>
                  <input
                    type="range" min="0" max="200" value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    onMouseUp={applyAdjustments}
                    className="w-full"
                    style={{ accentColor: theme.primary }}
                  />
                  <span className="text-xs" style={{ color: theme.textMuted }}>{saturation}%</span>
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block flex items-center gap-1.5" style={{ color: theme.text }}>
                    <Sparkles className="w-3.5 h-3.5" /> Filters
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {filters.map((f) => (
                      <button
                        key={f.name}
                        onClick={() => { setFilter(f.value); setTimeout(applyAdjustments, 50); }}
                        className={cn(
                          "px-2 py-1.5 rounded-lg text-xs border transition-colors",
                          filter === f.value ? "border-current font-medium" : "border-transparent hover:bg-black/5"
                        )}
                        style={{ color: filter === f.value ? theme.primary : theme.text, borderColor: filter === f.value ? theme.primary : undefined }}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => rotate(-90)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs border hover:bg-black/5 transition-colors" style={{ borderColor: theme.border, color: theme.text }}>
                    <RotateCw className="w-3 h-3" /> Rotate Left
                  </button>
                  <button onClick={() => rotate(90)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs border hover:bg-black/5 transition-colors" style={{ borderColor: theme.border, color: theme.text }}>
                    <RotateCw className="w-3 h-3" /> Right
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => flip("h")} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs border hover:bg-black/5 transition-colors" style={{ borderColor: theme.border, color: theme.text }}>
                    <FlipHorizontal className="w-3 h-3" /> Flip H
                  </button>
                  <button onClick={() => flip("v")} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs border hover:bg-black/5 transition-colors" style={{ borderColor: theme.border, color: theme.text }}>
                    <FlipVertical className="w-3 h-3" /> V
                  </button>
                </div>
              </div>
            )}

            {activeTool === "draw" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: theme.text }}>Color</label>
                  <div className="flex gap-1 flex-wrap">
                    {["#1e3a5f", "#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#000000", "#ffffff"].map((c) => (
                      <button key={c} onClick={() => setDrawColor(c)} className={cn("w-6 h-6 rounded-full border-2", drawColor === c ? "border-gray-900 scale-110" : "border-transparent")} style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: theme.text }}>Size: {drawSize}px</label>
                  <input type="range" min="1" max="50" value={drawSize} onChange={(e) => setDrawSize(Number(e.target.value))} className="w-full" style={{ accentColor: theme.primary }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: theme.text }}>Opacity: {drawOpacity}%</label>
                  <input type="range" min="1" max="100" value={drawOpacity} onChange={(e) => setDrawOpacity(Number(e.target.value))} className="w-full" style={{ accentColor: theme.primary }} />
                </div>
              </div>
            )}

            {activeTool === "text" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: theme.text }}>Text</label>
                  <input
                    type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type here..."
                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                    style={{ background: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: theme.text }}>Color</label>
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-full h-8 rounded-lg cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: theme.text }}>Size: {textSize}px</label>
                  <input type="range" min="12" max="120" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} className="w-full" style={{ accentColor: theme.primary }} />
                </div>
                <button onClick={addText} className="w-full py-2 rounded-lg text-xs font-medium text-white" style={{ background: theme.primary }}>
                  Add Text
                </button>
              </div>
            )}

            {activeTool === "crop" && (
              <div className="space-y-4">
                <p className="text-xs" style={{ color: theme.textMuted }}>Click and drag on the image to select crop area, then click Apply Crop.</p>
                <button
                  onClick={applyCrop}
                  disabled={!cropStart || !cropEnd}
                  className="w-full py-2 rounded-lg text-xs font-medium text-white disabled:opacity-40 transition-colors"
                  style={{ background: theme.primary }}
                >
                  Apply Crop
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
