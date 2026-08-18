"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, AlertTriangle } from "lucide-react";

const SCHOOL_NAME = "BISHOP DAVIS JOY ACADEMY";
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

interface WorldClassLoaderProps {
  message?: string;
  subMessage?: string;
  timeoutSeconds?: number;
  onTimeout?: () => void;
  error?: string;
}

function useScrambleText(finalText: string, trigger: boolean, speed = 28) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setDisplay("");
    setDone(false);
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        finalText
          .split("")
          .map((char, idx) => {
            if (char === " ") return " ";
            if (idx < Math.floor(iteration)) return finalText[idx];
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          })
          .join("")
      );
      if (iteration >= finalText.length) {
        clearInterval(interval);
        setDisplay(finalText);
        setDone(true);
      }
      iteration += 0.5;
    }, speed);
    return () => clearInterval(interval);
  }, [trigger, finalText, speed]);

  return { display, done };
}

function MonitorSVG({ phase }: { phase: "hidden" | "building" | "ready" | "done" }) {
  return (
    <motion.svg
      width="200"
      height="160"
      viewBox="0 0 200 160"
      fill="none"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{
        scale: phase === "hidden" ? 0.6 : 1,
        opacity: phase === "hidden" ? 0 : 1,
      }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: phase === "hidden" ? 0 : 0.2 }}
    >
      <motion.rect
        x="85" y="130" width="30" height="12" rx="2"
        fill="#1e293b"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      />
      <motion.rect
        x="70" y="142" width="60" height="6" rx="3"
        fill="#1e293b"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.6, type: "spring" }}
        style={{ transformOrigin: "100px 145px" }}
      />
      <motion.rect
        x="20" y="20" width="160" height="110" rx="10"
        fill="#0f172a"
        stroke="#334155"
        strokeWidth="2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      />
      <motion.rect
        x="28" y="28" width="144" height="94" rx="4"
        fill="#020617"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      />
      <motion.rect
        x="28" y="28" width="144" height="94" rx="4"
        fill="url(#screenGlow)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 0.8 }}
      />
      <defs>
        <linearGradient id="screenGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

function GraduationCapSVG() {
  return (
    <motion.svg
      width="56"
      height="44"
      viewBox="0 0 56 44"
      fill="none"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.4, type: "spring", stiffness: 200 }}
    >
      <path d="M4 18L28 8L52 18L28 28L4 18Z" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />
      <path d="M4 18L28 12L52 18" fill="#0f172a" />
      <rect x="20" y="26" width="16" height="10" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <circle cx="28" cy="18" r="3" fill="#d4a843" />
      <motion.path
        d="M48 18C48 18 50 24 50 28C50 32 48 36 46 38"
        stroke="#d4a843"
        strokeWidth="1.5"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      />
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>
        <line x1="44" y1="38" x2="42" y2="42" stroke="#d4a843" strokeWidth="1" />
        <line x1="46" y1="38" x2="45" y2="42" stroke="#d4a843" strokeWidth="1" />
        <line x1="48" y1="38" x2="48" y2="42" stroke="#d4a843" strokeWidth="1" />
        <line x1="45" y1="38" x2="43" y2="42" stroke="#d4a843" strokeWidth="1" />
      </motion.g>
    </motion.svg>
  );
}

function WifiRadar() {
  return (
    <motion.div
      className="absolute -top-2 -left-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
    >
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 flex items-end justify-start pb-1 pl-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
        </div>
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute bottom-1 left-1 rounded-full border border-emerald-400/40"
            style={{ width: i * 10, height: i * 10, transformOrigin: "bottom left" }}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0.3, 1.2, 1.5] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4 + 1,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function SkeletonBars({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="flex flex-col gap-2 w-36 mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 2.6 }}
        >
          {[0.7, 0.5, 0.4].map((w, i) => (
            <div key={i} className="h-2 rounded-full bg-slate-700/40 overflow-hidden relative" style={{ width: `${w * 100}%` }}>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-500/20 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
              />
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FloatingShapes() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-slate-700/20"
          style={{
            width: 20 + i * 12,
            height: 20 + i * 12,
            left: `${10 + i * 18}%`,
            top: `${20 + i * 10}%`,
          }}
          animate={{
            y: [0, -15, 0],
            x: [0, 8, -5, 0],
            rotate: [0, 10, -5, 0],
          }}
          transition={{
            duration: 6 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}

export default function WorldClassLoader({
  message = "Preparing your portal",
  subMessage = "Bishop Davis Joy Academy",
  timeoutSeconds,
  onTimeout,
  error: propError,
}: WorldClassLoaderProps) {
  const [phase, setPhase] = useState<"hidden" | "building" | "ready" | "done">("hidden");
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [loopKey, setLoopKey] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const { display: scrambledText, done: textDone } = useScrambleText(SCHOOL_NAME, phase === "ready", 24);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    if (propError) {
      setTimedOut(true);
      return;
    }
    const t1 = setTimeout(() => setPhase("building"), 100);
    const t2 = setTimeout(() => setPhase("ready"), 900);
    const t3 = setTimeout(() => setShowSkeleton(true), 2600);
    const t4 = setTimeout(() => {
      setPhase("done");
      setShowSkeleton(false);
    }, 5000);
    const t5 = setTimeout(() => {
      setPhase("hidden");
      setLoopKey((k) => k + 1);
    }, 5800);

    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
    if (timeoutSeconds && timeoutSeconds > 0) {
      timeoutTimer = setTimeout(() => {
        setTimedOut(true);
        if (onTimeout) onTimeout();
      }, timeoutSeconds * 1000);
    }

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5);
      if (timeoutTimer) clearTimeout(timeoutTimer);
    };
  }, [loopKey, timeoutSeconds, onTimeout, propError]);

  // Error state
  if (timedOut || propError) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 px-6">
        <div className="w-14 h-14 rounded-xl bg-red-500/8 border border-red-500/15 flex items-center justify-center mb-5">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Unable to load</h2>
        <p className="text-sm text-slate-400 max-w-sm text-center mb-6">
          {propError || "The page is taking longer than expected to load."}
        </p>
        <button
          onClick={handleReload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium rounded-xl text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Reload Page
        </button>
      </div>
    );
  }

  return (
    <div key={loopKey} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/[0.03] blur-3xl rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-emerald-500/[0.02] blur-3xl rounded-full" />
      </div>

      <FloatingShapes />

      <div className="relative flex flex-col items-center">
        <WifiRadar />
        <MonitorSVG phase={phase} />

        <div className="absolute top-[42px] left-1/2 -translate-x-1/2 text-center w-[140px]">
          <AnimatePresence>
            {phase === "ready" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-[8px] font-mono text-amber-400/90 tracking-[0.15em] leading-tight">
                  {scrambledText}
                </p>
                {textDone && (
                  <motion.div
                    className="mx-auto mt-1 h-[1px] bg-amber-400/40 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                )}
                <motion.span
                  className="inline-block w-[3px] h-[6px] bg-amber-400/60 mt-0.5"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute top-[58px] left-1/2 -translate-x-1/2">
          <GraduationCapSVG />
        </div>

        <SkeletonBars visible={showSkeleton} />
      </div>

      <motion.div
        className="mt-10 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <p className="text-sm font-medium text-slate-300 tracking-wide">{message}</p>
        <p className="text-xs text-slate-600 mt-1">{subMessage}</p>
      </motion.div>
    </div>
  );
}
