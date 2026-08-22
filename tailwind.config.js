/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bdja: {
          primary: "#1e3a5f",
          secondary: "#c9a227",
          accent: "#2d5a87",
          light: "#f0f4f8",
          dark: "#0f1f33",
          success: "#22c55e",
          warning: "#f59e0b",
          danger: "#ef4444",
        },
        primary: { 50: "#eff6ff", 100: "#dbeafe", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 900: "#1e3a8a" },
        secondary: { 50: "#f8fafc", 100: "#f1f5f9", 500: "#64748b", 600: "#475569", 700: "#334155", 900: "#0f172a" },
      },
    },
  },
  plugins: [],
};
