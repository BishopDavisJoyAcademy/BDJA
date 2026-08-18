import type { Metadata } from "next";
import { PublicLayout } from "@/components/layout/PublicLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bishop Davis Joy Academy - Excellence in Education",
  description: "Welcome to Bishop Davis Joy Academy. Quality education for a brighter future. Playgroup to Grade 6.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PublicLayout>{children}</PublicLayout>
      </body>
    </html>
  );
}
