"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({ children, variant = "primary", size = "md", isLoading, disabled, className, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-bdja-primary text-white hover:bg-bdja-accent",
    secondary: "bg-bdja-secondary text-white hover:bg-yellow-600",
    outline: "border-2 border-bdja-primary text-bdja-primary hover:bg-bdja-primary hover:text-white",
    danger: "bg-bdja-danger text-white hover:bg-red-600",
    ghost: "text-gray-600 hover:bg-gray-100",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };

  return (
    <button
      disabled={disabled || isLoading}
      className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed", variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
