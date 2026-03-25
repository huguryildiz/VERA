// src/admin/analytics/AnalyticsDashboardStates.jsx
// Loading, error, and empty states for the analytics dashboard.
// Extracted from AnalyticsTab.jsx — structural refactor only.

import { CircleXLucideIcon } from "../../shared/Icons";

// ── Loading skeleton ──────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="dashboard-loading">
      <div className="dashboard-skeleton-row">
        <div className="skeleton-card skeleton-wide" />
      </div>
      <div className="dashboard-skeleton-row">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
      <div className="dashboard-skeleton-row">
        <div className="skeleton-card skeleton-wide" />
      </div>
      <div className="dashboard-skeleton-row">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────
export function DashboardError({ message }) {
  return (
    <div className="premium-error-banner is-critical" role="alert">
      <CircleXLucideIcon />
      <div>
        <div className="premium-error-title">Could not load analytics data</div>
        <div className="premium-error-detail">
          {message || "An unexpected error occurred. Please refresh the page."}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
export function DashboardEmpty() {
  return (
    <div className="dashboard-state-card">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
      </svg>
      <p className="dashboard-state-title">No data available</p>
      <span className="dashboard-state-sub">Evaluations will appear here once jurors submit their scores.</span>
    </div>
  );
}
