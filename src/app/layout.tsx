import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/components/shared/QueryProvider";

export const metadata: Metadata = {
  title: "BDJA Platform | Bishop Davis Joy Academy",
  description: "Prayer, Commitment and Hard Work for Success. Competency-Based Curriculum platform for Playgroup - Grade 6.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e3a5f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1e3a5f",
                color: "#fff",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
