"use client";

import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectOption { value: string; label: string; }

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-bdja-primary/20 focus:border-bdja-primary transition-colors",
        className
      )}
      {...props}
    >
      {options ? options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>) : children}
    </select>
  )
);
Select.displayName = "Select";
export { Select };
