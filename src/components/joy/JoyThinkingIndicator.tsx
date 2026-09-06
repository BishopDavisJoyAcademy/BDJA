"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, PenTool, Loader2 } from "lucide-react";
import { ThemeConfig } from "@/lib/joy-themes";
import { cn } from "@/lib/utils";

export type ThinkingPhase = "thinking" | "searching" | "drawing" | "typing";

interface JoyThinkingIndicatorProps {
  phase: ThinkingPhase;
  theme: ThemeConfig;
  className?: string;
}

const PHASE_CONFIG: Record<ThinkingPhase, { label: string; icon: typeof Sparkles; sublabel: string }> = {
  thinking: { label: "Joy is thinking...", icon: Sparkles, sublabel: "Analyzing your request" },
  searching: { label: "Searching the web...", icon: Search, sublabel: "Finding the best sources" },
  drawing: { label: "Joy is drawing...", icon: PenTool, sublabel: "Creating your illustration" },
  typing: { label: "Joy is typing...", icon: Loader2, sublabel: "Formulating response" },
};

export function JoyThinkingIndicator({ phase, theme, className }: JoyThinkingIndicatorProps) {
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn("flex gap-3 items-start", className)}
    >
      {/* Avatar with neural pulse */}
      <div className="relative shrink-0">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: theme.primary }}
          animate={{
            scale: [1, 1.6, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: theme.primary }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.2, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
        />
        <div
          className="relative w-9 h-9 rounded-full flex items-center justify-center border"
          style={{
            background: theme.primary + "18",
            borderColor: theme.primary + "40",
          }}
        >
          <Icon className="w-4 h-4" style={{ color: theme.primary }} />
        </div>
      </div>

      {/* Content bubble */}
      <div className="max-w-[80%]">
        <div
          className="px-4 py-3 rounded-2xl rounded-bl-md border"
          style={{
            background: theme.assistantBubble,
            borderColor: theme.border,
          }}
        >
          {/* Phase label */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold" style={{ color: theme.text }}>
              {config.label}
            </span>
            {phase === "typing" && (
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-lg leading-none"
                style={{ color: theme.primary }}
              >
                |
              </motion.span>
            )}
          </div>

          {/* Sublabel */}
          <p className="text-xs mb-3" style={{ color: theme.textMuted }}>
            {config.sublabel}
          </p>

          {/* Animated dots / bars */}
          <div className="flex items-center gap-2">
            {phase === "searching" ? (
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: theme.primary }}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            ) : phase === "drawing" ? (
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-4 h-0.5 rounded-full"
                    style={{ background: theme.primary }}
                    animate={{
                      scaleX: [0.3, 1, 0.3],
                      opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ background: theme.primary }}
                    animate={{
                      y: [0, -6, 0],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            )}
            <span className="text-[10px] ml-1" style={{ color: theme.textMuted }}>
              {phase === "searching" ? "Scanning sources" : phase === "drawing" ? "Rendering strokes" : "Processing"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
