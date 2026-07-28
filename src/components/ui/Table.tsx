import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="overflow-x-auto">
      <table ref={ref} className={cn("w-full text-sm", className)} {...props} />
    </div>
  )
);
Table.displayName = "Table";

const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("bg-gray-50", className)} {...props} />
  )
);
TableHeader.displayName = "TableHeader";

const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("border-b border-gray-100 hover:bg-gray-50/50 transition-colors", className)} {...props} />
  )
);
TableRow.displayName = "TableRow";

const TableHead = forwardRef<HTMLTableCellElement, HTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn("px-4 py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider", className)} {...props} />
  )
);
TableHead.displayName = "TableHead";

const TableCell = forwardRef<HTMLTableCellElement, HTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-4 py-3 text-gray-600", className)} {...props} />
  )
);
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableRow, TableHead, TableCell };
