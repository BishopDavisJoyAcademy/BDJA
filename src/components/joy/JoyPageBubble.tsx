"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, MessageCircle, ChevronRight, Wand2 } from "lucide-react";
import { useJoyPageAssistant } from "@/hooks/useJoyPageAssistant";
import { JoyPageAssistant } from "@/types/joy";
import { cn } from "@/lib/utils";

interface JoyPageBubbleProps {
  onOpenJoy?: (context?: string) => void;
}

export function JoyPageBubble({ onOpenJoy }: JoyPageBubbleProps) {
  const pathname = usePathname();
  const { assistant, loading, fetchAssistant, logInteraction } = useJoyPageAssistant();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);
  const [showPulse, setShowPulse] = useState(true);

  // Only show on dashboard pages
  const isDashboardPage = pathname?.startsWith("/dashboard") || pathname?.startsWith("/student") || pathname?.startsWith("/teacher") || pathname?.startsWith("/parent");

  useEffect(() => {
    if (!isDashboardPage || hasBeenDismissed) {
      setIsVisible(false);
      return;
    }

    // Small delay before showing bubble
    const timer = setTimeout(() => {
      fetchAssistant(pathname || "");
      setIsVisible(true);
    }, 1500);

    // Stop pulsing after 10 seconds
    const pulseTimer = setTimeout(() => setShowPulse(false), 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(pulseTimer);
    };
  }, [pathname, isDashboardPage, hasBeenDismissed, fetchAssistant]);

  const handleDismiss = useCallback(() => {
    setIsExpanded(false);
    setHasBeenDismissed(true);
    logInteraction(pathname || "", "dismiss_bubble");
  }, [pathname, logInteraction]);

  const handleSuggestionClick = useCallback((suggestion: { text: string; action: string }) => {
    logInteraction(pathname || "", `click_suggestion_${suggestion.action}`, suggestion.text);
    setIsExpanded(false);

    // Build context message for Joy
    const contextMessage = assistant
      ? `I am on the ${assistant.page_name} page. ${assistant.context_prompt} I want to: ${suggestion.text}`
      : `I want to: ${suggestion.text}`;

    if (onOpenJoy) {
      onOpenJoy(contextMessage);
    }
  }, [assistant, pathname, logInteraction, onOpenJoy]);

  const handleBubbleClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
    if (!isExpanded) {
      logInteraction(pathname || "", "open_bubble");
    }
  }, [isExpanded, pathname, logInteraction]);

  if (!isVisible || !isDashboardPage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isExpanded && assistant && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-72 bg-slate-900/95 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl shadow-2xl overflow-hidden"
            style={{ boxShadow: "0 8px 32px rgba(212, 175, 55, 0.15)" }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-sm font-semibold text-[#D4AF37]">Joy</span>
                <span className="text-xs text-slate-400">— {assistant.page_name}</span>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Context Message */}
            <div className="px-4 py-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                {assistant.context_prompt}
              </p>
            </div>

            {/* Suggested Actions */}
            {assistant.suggested_actions && assistant.suggested_actions.length > 0 && (
              <div className="px-4 pb-4 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Quick Actions</p>
                {assistant.suggested_actions.map((action, index) => (
                  <motion.button
                    key={action.action}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSuggestionClick(action)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all",
                      "bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]",
                      "hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/50"
                    )}
                  >
                    <Wand2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1">{action.text}</span>
                    <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-700/50">
              <button
                onClick={() => {
                  logInteraction(pathname || "", "open_full_chat");
                  setIsExpanded(false);
                  if (onOpenJoy) {
                    onOpenJoy(`I am on the ${assistant.page_name} page. ${assistant.context_prompt}`);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-[#D4AF37] transition-colors py-1"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Open full chat
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble Button */}
      <motion.button
        onClick={handleBubbleClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative w-14 h-14 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-[#D4AF37] to-[#B8941F]",
          "shadow-lg transition-shadow",
          showPulse && "animate-pulse"
        )}
        style={{
          boxShadow: showPulse
            ? "0 4px 20px rgba(212, 175, 55, 0.4)"
            : "0 4px 16px rgba(212, 175, 55, 0.25)",
        }}
      >
        <Sparkles className="w-6 h-6 text-slate-900" />

        {/* Notification dot */}
        {assistant && !isExpanded && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-slate-900" />
        )}
      </motion.button>
    </div>
  );
}
