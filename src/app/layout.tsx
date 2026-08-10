import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BDJA Platform - Bishop Davis Joy Academy",
  description: "Prayer, Commitment and Hard Work for Success",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
