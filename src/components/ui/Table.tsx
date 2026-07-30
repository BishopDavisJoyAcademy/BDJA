"use client";

import { cn } from "@/lib/utils";

interface TableProps { children: React.ReactNode; className?: string; }

export function Table({ children, className }: TableProps) {
  return <div className="overflow-x-auto"><table className={cn("w-full text-sm text-left", className)}>{children}</table></div>;
}

export function TableHead({ children, className }: TableProps) {
  return <thead className={cn("bg-gray-50 text-gray-600 font-medium", className)}>{children}</thead>;
}

export function TableBody({ children, className }: TableProps) {
  return <tbody className={cn("divide-y divide-gray-100", className)}>{children}</tbody>;
}

export function TableRow({ children, className }: TableProps) {
  return <tr className={cn("hover:bg-gray-50 transition-colors", className)}>{children}</tr>;
}

export function TableCell({ children, className }: TableProps) {
  return <td className={cn("px-4 py-3", className)}>{children}</td>;
}

export function TableHeader({ children, className }: TableProps) {
  return <th className={cn("px-4 py-3", className)}>{children}</th>;
}
