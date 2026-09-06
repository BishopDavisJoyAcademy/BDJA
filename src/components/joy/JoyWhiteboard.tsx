"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  PenTool, Eraser, Trash2, Undo2, X, Wand2, Type,
  Square, Circle, Triangle, Minus, Grid3X3, Download,
  Paintbrush, ZoomIn, ZoomOut, Move, Palette, MousePointer2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { JoyAIDrawPanel, AIDrawingStroke } from "./JoyAIDrawPanel";
import { ThemeConfig } from "@/lib/joy-themes";

type Tool = "pen" | "eraser" | "line" | "rect" | "circle" | "triangle" | "text" | "select";
type BrushType = "round" | "square" | "spray";

interface Point { x: number; y: number }

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  tool: Tool;
  brushType: BrushType;
  opacity: number;
}

interface JoyWhiteboardProps {
  isOpen: boolean;
  theme: ThemeConfig;
  onClose: () => void;
  onSave: (dataUrl: string, strokes: Stroke[]) => void;
}

const PRESET_COLORS = [
  "#1e3a5f", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#000000",
  "#64748b", "#D4AF37", "#ffffff",
];

export function JoyWhiteboard({ isOpen, theme, onClose, onSave }: JoyWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [color, setColor] = useState("#D4AF37");
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState<Tool>("pen");
  const [brushType, setBrushType] = useState<BrushType>("round");
  const [opacity, setOpacity] = useState(1);
  const [showAIDraw, setShowAIDraw] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<Point | null>(null);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [isDrawing, setIsDrawing] = useState(false);

  // Responsive canvas sizing
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const resize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setCanvasSize({
          width: Math.max(400, Math.floor(rect.width - 32)),
          height: Math.max(300, Math.floor(rect.height - 120)),
        });
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [isOpen]);

  // Drawing helpers
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 0.5;
    const step = 20;
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }, []);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;
    ctx.globalAlpha = stroke.opacity;
    ctx.lineCap = stroke.brushType === "square" ? "square" : "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
    }

    ctx.lineWidth = stroke.width;

    if (stroke.tool === "rect" && stroke.points.length === 2) {
      const [p1, p2] = stroke.points;
      ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    } else if (stroke.tool === "circle" && stroke.points.length === 2) {
      const [p1, p2] = stroke.points;
      const radius = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (stroke.tool === "triangle" && stroke.points.length === 2) {
      const [p1, p2] = stroke.points;
      ctx.beginPath();
      ctx.moveTo(p1.x, p2.y);
      ctx.lineTo((p1.x + p2.x) / 2, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();
      ctx.stroke();
    } else if (stroke.tool === "line" && stroke.points.length === 2) {
      const [p1, p2] = stroke.points;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.save();
    ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width / zoom, canvas.height / zoom);

    if (showGrid) drawGrid(ctx, canvas.width / zoom, canvas.height / zoom);

    strokes.forEach((stroke) => drawStroke(ctx, stroke));
    if (currentStroke) drawStroke(ctx, currentStroke);

    ctx.restore();
  }, [strokes, currentStroke, backgroundColor, showGrid, zoom, pan, drawGrid, drawStroke]);

  // Initialize & redraw canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    redrawCanvas();
  }, [isOpen, canvasSize, redrawCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if ((e as React.MouseEvent).button === 1 || (e as React.MouseEvent).shiftKey) {
      setIsPanning(true);
      setPanStart({
        x: "touches" in e ? e.touches[0].clientX : e.clientX,
        y: "touches" in e ? e.touches[0].clientY : e.clientY,
      });
      return;
    }
    const pos = getPos(e);
    if (tool === "text") {
      setTextPos(pos);
      return;
    }
    setIsDrawing(true);
    setCurrentStroke({
      points: [pos],
      color,
      width: size,
      tool,
      brushType,
      opacity,
    });
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isPanning) {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setPan((prev) => ({
        x: prev.x + clientX - panStart.x,
        y: prev.y + clientY - panStart.y,
      }));
      setPanStart({ x: clientX, y: clientY });
      return;
    }
    if (!currentStroke || !isDrawing) return;
    const pos = getPos(e);
    if (["rect", "circle", "triangle", "line"].includes(tool)) {
      setCurrentStroke({ ...currentStroke, points: [currentStroke.points[0], pos] });
    } else {
      setCurrentStroke({ ...currentStroke, points: [...currentStroke.points, pos] });
    }
  };

  const handleEnd = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (!currentStroke || !isDrawing) return;
    setStrokes((prev) => [...prev, currentStroke]);
    setCurrentStroke(null);
    setIsDrawing(false);
  };

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
    toast.info("Undo: last stroke removed");
  };

  const handleClear = () => {
    setStrokes([]);
    toast.info("Canvas cleared");
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl, strokes);
    toast.success("Whiteboard saved!");
    onClose();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `bdja-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Image downloaded");
  };

  const handleTextSubmit = () => {
    if (!textInput.trim() || !textPos) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);
    ctx.font = `${size * 3 + 10}px sans-serif`;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.fillText(textInput, textPos.x, textPos.y);
    ctx.restore();
    setStrokes((prev) => [...prev, {
      points: [textPos, { x: textPos.x + 100, y: textPos.y }],
      color, width: size, tool: "text", brushType, opacity,
    }]);
    setTextInput("");
    setTextPos(null);
  };

  const animateAIDrawing = (aiStrokes: AIDrawingStroke[]) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const cursor = document.createElement("div");
    cursor.style.cssText = "position:fixed;width:10px;height:10px;border-radius:50%;background:#D4AF37;box-shadow:0 0 12px #D4AF37,0 0 24px #D4AF37;pointer-events:none;z-index:9999;transition:none;";
    document.body.appendChild(cursor);

    let strokeIndex = 0;
    let pointIndex = 0;

    const drawNext = () => {
      if (strokeIndex >= aiStrokes.length) {
        cursor.remove();
        setStrokes((prev) => [...prev, ...aiStrokes.map((s) => ({
          points: s.points, color: s.color, width: s.width,
          tool: "pen" as Tool, brushType: "round" as BrushType, opacity: 1,
        }))]);
        toast.success("AI drawing complete!");
        return;
      }

      const stroke = aiStrokes[strokeIndex];
      if (pointIndex === 0) {
        ctx.save();
        ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      }

      if (pointIndex < stroke.points.length - 1) {
        const nextP = stroke.points[pointIndex + 1];
        ctx.lineTo(nextP.x, nextP.y);
        ctx.stroke();
        const rect = canvas.getBoundingClientRect();
        cursor.style.left = `${rect.left + nextP.x * zoom + pan.x - 5}px`;
        cursor.style.top = `${rect.top + nextP.y * zoom + pan.y - 5}px`;
        pointIndex++;
        requestAnimationFrame(drawNext);
      } else {
        strokeIndex++;
        pointIndex = 0;
        ctx.restore();
        requestAnimationFrame(drawNext);
      }
    };

    drawNext();
  };

  if (!isOpen) return null;

  const toolBtn = (t: Tool, icon: React.ElementType, label: string) => (
    <button
      key={t}
      onClick={() => setTool(t)}
      className={`p-2 rounded-xl transition-all duration-200 ${
        tool === t
          ? "bg-[#D4AF37]/20 text-[#D4AF37] ring-1 ring-[#D4AF37]/40 shadow-sm"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
      }`}
      title={label}
    >
      <icon className="w-4 h-4" />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm"
    >
      {/* Toolbar */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-slate-900/80 overflow-x-auto"
      >
        <div className="flex items-center gap-2 shrink-0 mr-2">
          <PenTool className="w-4 h-4" style={{ color: "#D4AF37" }} />
          <span className="font-semibold text-sm text-slate-100">Whiteboard</span>
        </div>

        <div className="w-px h-6 bg-slate-700/50 shrink-0" />

        {/* Tools */}
        <div className="flex items-center gap-1">
          {toolBtn("pen", PenTool, "Pen")}
          {toolBtn("eraser", Eraser, "Eraser")}
          {toolBtn("line", Minus, "Line")}
          {toolBtn("rect", Square, "Rectangle")}
          {toolBtn("circle", Circle, "Circle")}
          {toolBtn("triangle", Triangle, "Triangle")}
          {toolBtn("text", Type, "Text")}
          {toolBtn("select", MousePointer2, "Select / Pan")}
        </div>

        <div className="w-px h-6 bg-slate-700/50 shrink-0 mx-1" />

        {/* Brush types */}
        <div className="flex items-center gap-1">
          {(["round", "square", "spray"] as BrushType[]).map((bt) => (
            <button
              key={bt}
              onClick={() => setBrushType(bt)}
              className={`p-2 rounded-xl text-[10px] font-medium capitalize transition-all ${
                brushType === bt
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] ring-1 ring-[#D4AF37]/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
              title={`${bt} brush`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-700/50 shrink-0 mx-1" />

        {/* Color palette */}
        <div className="flex items-center gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                color === c ? "border-white scale-110 shadow-sm" : "border-transparent hover:scale-105"
              }`}
              style={{ background: c }}
              title={c}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 p-0 ml-1"
            title="Custom color"
          />
        </div>

        <div className="w-px h-6 bg-slate-700/50 shrink-0 mx-1" />

        {/* Size */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 w-6">{size}px</span>
          <input
            type="range" min="1" max="50" value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-20 accent-[#D4AF37]"
          />
        </div>

        {/* Opacity */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 w-6">{Math.round(opacity * 100)}%</span>
          <input
            type="range" min="0.1" max="1" step="0.1" value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-16 accent-[#D4AF37]"
          />
        </div>

        <div className="w-px h-6 bg-slate-700/50 shrink-0 mx-1" />

        {/* View controls */}
        <button onClick={() => setShowGrid((p) => !p)} className={`p-2 rounded-xl transition-all ${showGrid ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`} title="Toggle grid">
          <Grid3X3 className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom((z) => Math.min(z + 0.2, 3))} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800" title="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800" title="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800" title="Reset view">
          <Move className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-slate-700/50 shrink-0 mx-1" />

        {/* Actions */}
        <button onClick={handleUndo} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800" title="Undo (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={handleClear} className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Clear canvas">
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={handleDownload} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800" title="Download PNG">
          <Download className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-slate-700/50 shrink-0 mx-1" />

        {/* AI Draw */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAIDraw(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37]/25 ring-1 ring-[#D4AF37]/30 transition-all shrink-0"
        >
          <Wand2 className="w-3.5 h-3.5" />
          AI Draw
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-900 bg-[#D4AF37] hover:bg-[#E8C84A] transition-colors shrink-0"
        >
          Save
        </motion.button>
        <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800" title="Close">
          <X className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Canvas container */}
      <div ref={containerRef} className="flex-1 p-4 overflow-hidden relative">
        <motion.canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full rounded-2xl border border-slate-700/50 cursor-crosshair touch-none bg-white shadow-2xl"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />

        {/* AI Draw Panel */}
        <AnimatePresence>
          {showAIDraw && (
            <JoyAIDrawPanel
              theme={theme}
              onClose={() => setShowAIDraw(false)}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
              onDraw={(aiStrokes) => {
                setShowAIDraw(false);
                animateAIDrawing(aiStrokes);
              }}
            />
          )}
        </AnimatePresence>

        {/* Text input overlay */}
        <AnimatePresence>
          {textPos && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute z-30 flex gap-2 items-center p-3 rounded-xl border border-slate-700/50 bg-slate-900 shadow-2xl"
              style={{ left: Math.min(textPos.x * zoom + pan.x + 16, canvasSize.width - 200), top: textPos.y * zoom + pan.y }}
            >
              <input
                autoFocus
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTextSubmit();
                  if (e.key === "Escape") { setTextPos(null); setTextInput(""); }
                }}
                placeholder="Type text..."
                className="px-3 py-2 rounded-lg text-sm bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#D4AF37]/40 w-48"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleTextSubmit}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#D4AF37] text-slate-900 hover:bg-[#E8C84A]"
              >
                Add
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-6 right-6 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700/50 text-[11px] text-slate-400 backdrop-blur-sm flex items-center gap-3"
        >
          <span>Zoom: <span className="text-slate-200 font-medium">{Math.round(zoom * 100)}%</span></span>
          <span className="w-px h-3 bg-slate-700" />
          <span>Strokes: <span className="text-slate-200 font-medium">{strokes.length}</span></span>
          <span className="w-px h-3 bg-slate-700" />
          <span>Tool: <span className="text-[#D4AF37] font-medium capitalize">{tool}</span></span>
          <span className="w-px h-3 bg-slate-700" />
          <span>Size: <span className="text-slate-200 font-medium">{size}px</span></span>
        </motion.div>
      </div>
    </motion.div>
  );
}
