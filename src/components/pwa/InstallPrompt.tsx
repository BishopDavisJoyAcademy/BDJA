"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, GraduationCap } from "lucide-react";

const GOLD = "#D4AF37";
const DISMISSED_KEY = "bdja-install-dismissed";
const LOGIN_EVENT = "bdja:login-success";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * PWA install prompt.
 * - Never appears on public pages (only mounted inside the dashboard layout).
 * - Captures the browser's beforeinstallprompt event.
 * - Fires once, right after a successful login (bdja:login-success event).
 * - Never appears again after the app is installed or once the user dismisses it.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isInstalled()) return;
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onLoginSuccess = () => {
      // Wait briefly so the deferred prompt (if the browser fired it on load) is captured,
      // and so the user lands on the dashboard before being asked.
      setTimeout(() => setVisible(true), 1200);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(LOGIN_EVENT, onLoginSuccess);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(LOGIN_EVENT, onLoginSuccess);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Browser did not provide an install prompt (iOS Safari, already installed, etc.)
      return;
    }
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalling(false);
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      setVisible(false);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && !isInstalled() && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[90]"
          role="dialog"
          aria-label="Install the BDJA app"
        >
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Install BDJA App</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Add Bishop Davis Joy Academy to your home screen for instant, app-like access.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleInstall}
                    disabled={installing || !deferredPrompt}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-950 transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: GOLD }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {installing ? "Installing…" : "Install"}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 border border-slate-700/50 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
                  >
                    Not now
                  </button>
                </div>
                {!deferredPrompt && (
                  <p className="text-[10px] text-slate-500 mt-2">
                    If the button is unavailable, use your browser menu → “Add to Home Screen”.
                  </p>
                )}
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default InstallPrompt;
