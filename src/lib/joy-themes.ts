"use client";

export type JoyTheme =
  | "light"
  | "dark"
  | "ocean"
  | "forest"
  | "sunset"
  | "midnight"
  | "cream"
  | "gold";

export interface ThemeConfig {
  name: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  background: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textMuted: string;
  textInverse: string;
  border: string;
  userBubble: string;
  userBubbleText: string;
  assistantBubble: string;
  assistantBubbleText: string;
  codeBg: string;
  scrollbarThumb: string;
  scrollbarTrack: string;
  headerGradient: string;
  sendButton: string;
  sendButtonHover: string;
  shadow: string;
}

export const THEME_MAP: Record<JoyTheme, ThemeConfig> = {
  light: {
    name: "Light",
    primary: "#1e3a5f",
    primaryLight: "#2d5a87",
    primaryDark: "#0f1f33",
    accent: "#d4a843",
    background: "#f8fafc",
    surface: "#ffffff",
    surfaceHover: "#f1f5f9",
    text: "#0f172a",
    textMuted: "#64748b",
    textInverse: "#ffffff",
    border: "#e2e8f0",
    userBubble: "#1e3a5f",
    userBubbleText: "#ffffff",
    assistantBubble: "#f1f5f9",
    assistantBubbleText: "#0f172a",
    codeBg: "#1e293b",
    scrollbarThumb: "#94a3b8",
    scrollbarTrack: "#f1f5f9",
    headerGradient: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)",
    sendButton: "#1e3a5f",
    sendButtonHover: "#2d5a87",
    shadow: "0 10px 40px -10px rgba(0,0,0,0.15)",
  },
  dark: {
    name: "Dark",
    primary: "#60a5fa",
    primaryLight: "#93c5fd",
    primaryDark: "#3b82f6",
    accent: "#fbbf24",
    background: "#0f172a",
    surface: "#1e293b",
    surfaceHover: "#334155",
    text: "#f1f5f9",
    textMuted: "#94a3b8",
    textInverse: "#0f172a",
    border: "#334155",
    userBubble: "#3b82f6",
    userBubbleText: "#ffffff",
    assistantBubble: "#1e293b",
    assistantBubbleText: "#f1f5f9",
    codeBg: "#0f172a",
    scrollbarThumb: "#475569",
    scrollbarTrack: "#1e293b",
    headerGradient: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
    sendButton: "#3b82f6",
    sendButtonHover: "#60a5fa",
    shadow: "0 10px 40px -10px rgba(0,0,0,0.5)",
  },
  ocean: {
    name: "Ocean",
    primary: "#0891b2",
    primaryLight: "#22d3ee",
    primaryDark: "#0e7490",
    accent: "#f59e0b",
    background: "#ecfeff",
    surface: "#ffffff",
    surfaceHover: "#cffafe",
    text: "#164e63",
    textMuted: "#0e7490",
    textInverse: "#ffffff",
    border: "#a5f3fc",
    userBubble: "#0891b2",
    userBubbleText: "#ffffff",
    assistantBubble: "#ecfeff",
    assistantBubbleText: "#164e63",
    codeBg: "#083344",
    scrollbarThumb: "#22d3ee",
    scrollbarTrack: "#ecfeff",
    headerGradient: "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)",
    sendButton: "#0891b2",
    sendButtonHover: "#0e7490",
    shadow: "0 10px 40px -10px rgba(8,145,178,0.2)",
  },
  forest: {
    name: "Forest",
    primary: "#059669",
    primaryLight: "#34d399",
    primaryDark: "#047857",
    accent: "#fbbf24",
    background: "#f0fdf4",
    surface: "#ffffff",
    surfaceHover: "#dcfce7",
    text: "#14532d",
    textMuted: "#166534",
    textInverse: "#ffffff",
    border: "#bbf7d0",
    userBubble: "#059669",
    userBubbleText: "#ffffff",
    assistantBubble: "#f0fdf4",
    assistantBubbleText: "#14532d",
    codeBg: "#064e3b",
    scrollbarThumb: "#34d399",
    scrollbarTrack: "#f0fdf4",
    headerGradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    sendButton: "#059669",
    sendButtonHover: "#047857",
    shadow: "0 10px 40px -10px rgba(5,150,105,0.2)",
  },
  sunset: {
    name: "Sunset",
    primary: "#c2410c",
    primaryLight: "#fb923c",
    primaryDark: "#9a3412",
    accent: "#fbbf24",
    background: "#fff7ed",
    surface: "#ffffff",
    surfaceHover: "#ffedd5",
    text: "#7c2d12",
    textMuted: "#c2410c",
    textInverse: "#ffffff",
    border: "#fed7aa",
    userBubble: "#c2410c",
    userBubbleText: "#ffffff",
    assistantBubble: "#fff7ed",
    assistantBubbleText: "#7c2d12",
    codeBg: "#431407",
    scrollbarThumb: "#fb923c",
    scrollbarTrack: "#fff7ed",
    headerGradient: "linear-gradient(135deg, #c2410c 0%, #ea580c 100%)",
    sendButton: "#c2410c",
    sendButtonHover: "#9a3412",
    shadow: "0 10px 40px -10px rgba(194,65,12,0.2)",
  },
  midnight: {
    name: "Midnight",
    primary: "#a78bfa",
    primaryLight: "#c4b5fd",
    primaryDark: "#8b5cf6",
    accent: "#f472b6",
    background: "#1e1b4b",
    surface: "#312e81",
    surfaceHover: "#4338ca",
    text: "#e0e7ff",
    textMuted: "#a5b4fc",
    textInverse: "#1e1b4b",
    border: "#4338ca",
    userBubble: "#8b5cf6",
    userBubbleText: "#ffffff",
    assistantBubble: "#312e81",
    assistantBubbleText: "#e0e7ff",
    codeBg: "#1e1b4b",
    scrollbarThumb: "#a78bfa",
    scrollbarTrack: "#312e81",
    headerGradient: "linear-gradient(135deg, #312e81 0%, #4338ca 100%)",
    sendButton: "#8b5cf6",
    sendButtonHover: "#a78bfa",
    shadow: "0 10px 40px -10px rgba(139,92,246,0.3)",
  },
  cream: {
    name: "Cream",
    primary: "#92400e",
    primaryLight: "#b45309",
    primaryDark: "#78350f",
    accent: "#d97706",
    background: "#fef3c7",
    surface: "#fffbeb",
    surfaceHover: "#fde68a",
    text: "#451a03",
    textMuted: "#92400e",
    textInverse: "#ffffff",
    border: "#fcd34d",
    userBubble: "#92400e",
    userBubbleText: "#ffffff",
    assistantBubble: "#fffbeb",
    assistantBubbleText: "#451a03",
    codeBg: "#451a03",
    scrollbarThumb: "#d97706",
    scrollbarTrack: "#fef3c7",
    headerGradient: "linear-gradient(135deg, #92400e 0%, #b45309 100%)",
    sendButton: "#92400e",
    sendButtonHover: "#78350f",
    shadow: "0 10px 40px -10px rgba(146,64,14,0.15)",
  },
};

export function getThemeConfig(theme: JoyTheme): ThemeConfig {
  return THEME_MAP[theme] || THEME_MAP.light;
}

export const THEME_LIST: { key: JoyTheme; name: string; preview: string }[] = [
  { key: "light", name: "Light", preview: "#1e3a5f" },
  { key: "dark", name: "Dark", preview: "#3b82f6" },
  { key: "ocean", name: "Ocean", preview: "#0891b2" },
  { key: "forest", name: "Forest", preview: "#059669" },
  { key: "sunset", name: "Sunset", preview: "#c2410c" },
  { key: "midnight", name: "Midnight", preview: "#8b5cf6" },
  { key: "cream", name: "Cream", preview: "#92400e" },
];
