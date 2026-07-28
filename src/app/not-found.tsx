"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bdja-primary via-bdja-accent to-bdja-dark p-4">
      <div className="text-center text-white">
        <AlertTriangle className="w-16 h-16 mx-auto mb-6 text-bdja-secondary" />
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-white/80 text-lg mb-8">Page not found</p>
        <Link href="/">
          <Button variant="secondary" size="lg">
            <Home className="w-5 h-5 mr-2" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
