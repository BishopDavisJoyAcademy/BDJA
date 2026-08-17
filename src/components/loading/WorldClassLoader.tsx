"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// Text scramble effect hook
function useTextScramble(
  finalText: string,
  trigger: boolean,
  speed = 30
) {
  const [display, setDisplay] = useState("");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

  useEffect(() => {
    if (!trigger) return;
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        finalText
          .split("")
          .map((char, idx) => {
            if (char === " ") return " ";
            if (char === ",") return ",";
            if (char === "&") return "&";
            if (idx < iteration) return finalText[idx];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      if (iteration >= finalText.length) {
        clearInterval(interval);
        setDisplay(finalText);
      }
      iteration += 1 / 2;
    }, speed);
    return () => clearInterval(interval);
  }, [trigger, finalText, speed, chars]);

  return display;
}

// Typewriter effect hook
function useTypewriter(
  text: string,
  trigger: boolean,
  speed = 60,
  delay = 0
) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setDisplay("");
    setDone(false);
    let i = 0;
    const startTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
          return;
        }
        setDisplay(text.slice(0, i + 1));
        i++;
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(startTimeout);
  }, [trigger, text, speed, delay]);

  return { display, done };
}

interface WorldClassLoaderProps {
  timeoutSeconds?: number;
  onTimeout?: () => void;
  error?: string | null;
}

export default function WorldClassLoader({
  timeoutSeconds = 8,
  onTimeout,
  error,
}: WorldClassLoaderProps) {
  const [phase, setPhase] = useState<"enter" | "stable" | "timeout" | "error">("enter");
  const [progress, setProgress] = useState(0);
  const [shimmerOffset, setShimmerOffset] = useState(-200);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mottoScramble = useTextScramble(
    "Prayer, Commitment & Hard Work",
    phase === "stable",
    25
  );

  const typewriter = useTypewriter(
    "Bishop Davis Joy Academy",
    phase === "enter",
    70,
    300
  );

  const subTypewriter = useTypewriter(
    "Preparing your workspace...",
    typewriter.done,
    40,
    200
  );

  // Progress bar animation
  useEffect(() => {
    if (phase !== "stable") return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) return p;
        return p + Math.random() * 3;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [phase]);

  // Shimmer animation
  useEffect(() => {
    const interval = setInterval(() => {
      setShimmerOffset((o) => (o >= 400 ? -200 : o + 2));
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // Phase transitions
  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("stable"), 600);
    const timeoutTimer = setTimeout(() => {
      setPhase("error");
      onTimeout?.();
    }, timeoutSeconds * 1000);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(timeoutTimer);
    };
  }, [timeoutSeconds, onTimeout]);

  // If error prop is passed, show error immediately
  useEffect(() => {
    if (error) setPhase("error");
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 300 + i * 80,
              height: 300 + i * 80,
              background: `radial-gradient(circle, ${
                i % 3 === 0
                  ? "rgba(245,158,11,0.08)"
                  : i % 3 === 1
                  ? "rgba(16,185,129,0.06)"
                  : "rgba(14,165,233,0.05)"
              } 0%, transparent 70%)`,
              left: `${15 + i * 18}%`,
              top: `${10 + i * 15}%`,
            }}
            animate={{
              x: [0, 40, -30, 0],
              y: [0, -40, 30, 0],
              scale: [1, 1.15, 0.9, 1],
            }}
            transition={{
              duration: 10 + i * 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo with skeleton shimmer */}
        <div className="relative mb-8">
          <motion.div
            className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
          >
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)`,
                transform: `translateX(${shimmerOffset}px)`,
                width: "60%",
              }}
            />
            <Image
              src="/logo.png"
              alt="Bishop Davis Joy Academy"
              width={72}
              height={72}
              className="object-contain relative z-0"
              priority
            />
          </motion.div>

          {/* Orbiting ring */}
          <motion.div
            className="absolute inset-0 rounded-2xl border border-amber-500/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{ margin: -4 }}
          />
          <motion.div
            className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "-44px 44px" }}
          />
        </div>

        {/* Typewriter title */}
        <div className="h-10 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-serif">
            {typewriter.display}
            <motion.span
              className="inline-block w-0.5 h-7 bg-amber-400 ml-0.5 align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </h1>
        </div>

        {/* Scramble motto */}
        <AnimatePresence>
          {typewriter.done && (
            <motion.p
              className="text-sm font-medium tracking-[0.2em] uppercase mb-6"
              style={{ color: "#fbbf24" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {mottoScramble}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Typewriter subtitle */}
        {typewriter.done && (
          <div className="h-6 mb-8">
            <p className="text-sm text-slate-400">
              {subTypewriter.display}
              {subTypewriter.done && (
                <motion.span
                  className="inline-block w-0.5 h-4 bg-slate-500 ml-0.5 align-middle"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              )}
            </p>
          </div>
        )}

        {/* Progress bar */}
        <AnimatePresence>
          {phase === "stable" && (
            <motion.div
              className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden mb-4"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 256 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)",
                  backgroundSize: "200% 100%",
                }}
                animate={{
                  width: `${Math.min(progress, 100)}%`,
                  backgroundPosition: ["0% 0%", "200% 0%"],
                }}
                transition={{
                  width: { duration: 0.3 },
                  backgroundPosition: { duration: 1.5, repeat: Infinity, ease: "linear" },
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skeleton cards */}
        <AnimatePresence>
          {phase === "stable" && (
            <motion.div
              className="flex gap-3 mt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.3 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-20 h-12 rounded-lg bg-slate-800/60 border border-slate-700/30 relative overflow-hidden"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)`,
                    }}
                    animate={{ x: [-80, 80] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error / Timeout state */}
        <AnimatePresence>
          {phase === "error" && (
            <motion.div
              className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl max-w-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm text-red-300 mb-3">
                {error || "Unable to connect. Please check your network and try again."}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm rounded-lg transition-colors"
              >
                Reload Page
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
