// src/admin/analytics/AnalyticsDashboardStates.jsx
// Loading, error, and empty states for the analytics dashboard.
// Extracted from AnalyticsTab.jsx — structural refactor only.

import { CircleAlert, Archive } from "lucide-react";

// ── Loading skeleton ──────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5">
        <div className="col-span-2 h-[280px] animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        <div className="h-[280px] animate-pulse rounded-2xl bg-muted" />
        <div className="h-[280px] animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        <div className="col-span-2 h-[220px] animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        <div className="h-[280px] animate-pulse rounded-2xl bg-muted" />
        <div className="h-[280px] animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────
export function DashboardError({ message }) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3" role="alert">
      <CircleAlert size={16} strokeWidth={2} className="text-destructive shrink-0 mt-0.5" />
      <div>
        <div className="font-bold text-destructive">Could not load analytics data</div>
        <div className="text-sm text-destructive">
          {message || "An unexpected error occurred. Please refresh the page."}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
export function DashboardEmpty() {
  return (
    <div className="rounded-lg border bg-card p-8 text-center flex flex-col items-center justify-center gap-2.5 mt-2">
      <Archive size={32} strokeWidth={1.5} className="text-muted-foreground" />
      <p className="text-[15px] font-semibold text-foreground m-0">No data available</p>
      <span className="text-[13px] text-muted-foreground max-w-[360px]">Evaluations will appear here once jurors submit their scores.</span>
    </div>
  );
}
