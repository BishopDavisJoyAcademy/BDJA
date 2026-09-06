"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, X, ChevronRight, Globe } from "lucide-react";
import { ThemeConfig } from "@/lib/joy-themes";
import { cn } from "@/lib/utils";

export interface SearchSource {
  id: string;
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
  domain: string;
}

interface JoySourceViewerProps {
  sources: SearchSource[];
  theme: ThemeConfig;
  className?: string;
}

export function JoySourceViewer({ sources, theme, className }: JoySourceViewerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (sources.length === 0) return null;

  return (
    <div className={cn("mt-3", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-3 h-3" style={{ color: theme.primary }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
          Sources
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, index) => (
          <motion.button
            key={source.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
            className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border transition-all hover:shadow-sm"
            style={{
              background: theme.assistantBubble,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{ background: theme.primary + "20", color: theme.primary }}
            >
              {index + 1}
            </span>
            <span className="truncate max-w-[120px]">{source.domain}</span>
            <ChevronRight className={cn("w-3 h-3 transition-transform", expandedId === source.id && "rotate-90")} style={{ color: theme.textMuted }} />
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {expandedId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 overflow-hidden"
          >
            {sources
              .filter((s) => s.id === expandedId)
              .map((source) => (
                <div
                  key={source.id}
                  className="p-3 rounded-xl border"
                  style={{ background: theme.assistantBubble, borderColor: theme.border }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold truncate" style={{ color: theme.text }}>
                        {source.title}
                      </h4>
                      <p className="text-[10px] mt-1 line-clamp-3" style={{ color: theme.textMuted }}>
                        {source.snippet}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedId(null)}
                      className="p-1 rounded hover:bg-black/5 shrink-0"
                    >
                      <X className="w-3 h-3" style={{ color: theme.textMuted }} />
                    </button>
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium hover:underline"
                    style={{ color: theme.primary }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {source.domain}
                  </a>
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
