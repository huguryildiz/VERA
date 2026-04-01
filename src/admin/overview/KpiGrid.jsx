// src/admin/overview/KpiGrid.jsx
// Statistics cards grid — matches shadcn-studio dashboard-shell-01 pattern.

import { cn } from "@/lib/utils";

export default function KpiGrid({ children, className }) {
  return (
    <div
      className={cn(
        "col-span-full grid gap-6 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}
