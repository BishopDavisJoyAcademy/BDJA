"use client";

import { cn } from "@/lib/utils";

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm text-left", className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className }: TableProps) {
  return (
    <thead className={cn("bg-slate-800/80 text-slate-300 font-medium border-b border-slate-700/50", className)}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className }: TableProps) {
  return (
    <tbody className={cn("divide-y divide-slate-800", className)}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className }: TableProps) {
  return (
    <tr className={cn("hover:bg-slate-800/50 transition-colors", className)}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className }: TableProps) {
  return (
    <td className={cn("px-4 py-3 text-slate-300", className)}>
      {children}
    </td>
  );
}

export function TableHeader({ children, className }: TableProps) {
  return (
    <th className={cn("px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400", className)}>
      {children}
    </th>
  );
}
