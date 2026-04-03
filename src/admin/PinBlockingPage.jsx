// src/admin/PinBlockingPage.jsx — Phase 9
// PIN Blocking page: monitor lockouts, risk signals, unlock access.
// Prototype: vera-premium-prototype.html lines 15050–15159

export default function PinBlockingPage() {
  return (
    <div className="page">
      <div className="page-title">PIN Blocking</div>
      <div className="page-desc" style={{ marginBottom: 14 }}>
        Monitor temporary PIN lockouts, review risk signals, and unlock juror access when required.
      </div>

      {/* Lock policy alert */}
      <div className="fb-alert fba-warning" style={{ marginBottom: 12 }}>
        <div className="fb-alert-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86 1.82 18A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <div className="fb-alert-body">
          <div className="fb-alert-title">Lock policy is active</div>
          <div className="fb-alert-desc">
            Jurors are locked for 15 minutes after 5 failed attempts. Manual unlock is logged in Audit Log.
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="scores-kpi-strip" style={{ marginBottom: 14 }}>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value" style={{ color: "var(--danger)" }}>—</div>
          <div className="scores-kpi-item-label">Currently Locked</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">—</div>
          <div className="scores-kpi-item-label">Today Lock Events</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">5</div>
          <div className="scores-kpi-item-label">Fail Threshold</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">15m</div>
          <div className="scores-kpi-item-label">Auto Unlock Window</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">—</div>
          <div className="scores-kpi-item-label">High Risk Patterns</div>
        </div>
      </div>

      {/* Active Lockouts */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <div className="card-title">Active Lockouts</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-outline btn-sm" disabled>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Policy
            </button>
            <button className="btn btn-sm" style={{ background: "var(--danger)", color: "#fff" }} disabled>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                <rect x="3" y="11" width="18" height="10" rx="2" />
              </svg>
              Unlock All
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Juror</th>
                <th>Period</th>
                <th>Failed Attempts</th>
                <th>Lock Started</th>
                <th>Unlock ETA</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="text-sm text-muted" style={{ textAlign: "center", padding: "18px 0" }}>
                  No active lockouts.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy Snapshot */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Policy Snapshot</div>
          <span className="text-sm text-muted">Applies to all jury access channels</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
          <div style={{ padding: "11px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)" }}>
            <div className="text-xs text-muted" style={{ marginBottom: 3 }}>Max failed attempts</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>5 attempts</div>
          </div>
          <div style={{ padding: "11px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)" }}>
            <div className="text-xs text-muted" style={{ marginBottom: 3 }}>Temporary lock duration</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>15 minutes</div>
          </div>
          <div style={{ padding: "11px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)" }}>
            <div className="text-xs text-muted" style={{ marginBottom: 3 }}>Escalation threshold</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>3 lockouts / day</div>
          </div>
          <div style={{ padding: "11px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-1)" }}>
            <div className="text-xs text-muted" style={{ marginBottom: 3 }}>Audit integration</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Enabled</div>
          </div>
        </div>
      </div>
    </div>
  );
}
