// src/admin/analytics/AnalyticsDashboardStates.jsx
// Loading, error, and empty states for the analytics dashboard.

// ── Loading skeleton ──────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="analytics-skeleton">
      <div className="skel-block" style={{ height: 80, marginBottom: 16 }} />
      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="skel-block" style={{ height: 260 }} />
        <div className="skel-block" style={{ height: 260 }} />
      </div>
      <div className="skel-block" style={{ height: 220, marginBottom: 14 }} />
      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="skel-block" style={{ height: 260 }} />
        <div className="skel-block" style={{ height: 260 }} />
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────
export function DashboardError({ message }) {
  return (
    <div className="insight-banner insight-banner--error" role="alert">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>Could not load analytics data</div>
        <div>{message || "An unexpected error occurred. Please refresh the page."}</div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
export function DashboardEmpty() {
  return (
    <div className="chart-card-v2" style={{ padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 8 }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }} aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No data available</p>
      <span style={{ fontSize: 13, color: "var(--text-tertiary)", maxWidth: 360 }}>Evaluations will appear here once jurors submit their scores.</span>
    </div>
  );
}
