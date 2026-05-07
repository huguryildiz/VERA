import { formatDateTime as fmtDate } from "@/shared/lib/dateUtils";

export default function SessionOverviewPanel({
  status,
  activeSessions,
  hasToken,
  isActive,
  recentActivities,
}) {
  return (
    <div className="ec-sessions">
      <div className="ec-sessions-title">
        Session Overview{" "}
        {status?.total_sessions != null && (
          <span className="ec-title-count">{status.total_sessions} total</span>
        )}
      </div>
      <div className="ec-sessions-grid">
        <div className="ec-sessions-stat">
          <div className="ec-sessions-stat-value success">{activeSessions}</div>
          <div className="ec-sessions-stat-label">Active</div>
        </div>
        <div className="ec-sessions-stat">
          <div className="ec-sessions-stat-value muted">{status?.expired_session_count ?? "—"}</div>
          <div className="ec-sessions-stat-label">Expired</div>
        </div>
        <div className="ec-sessions-stat">
          <div className="ec-sessions-stat-value">{status?.total_sessions ?? "—"}</div>
          <div className="ec-sessions-stat-label">Total</div>
        </div>
      </div>
      {status?.total_sessions > 0 && (
        <div className="ec-sessions-bar-wrap">
          <div className="ec-sessions-bar">
            <span style={{
              width: `${Math.round(((status.active_session_count || 0) / status.total_sessions) * 100)}%`,
              background: "var(--success)"
            }} />
          </div>
          <div className="ec-sessions-bar-label">
            {status.active_session_count || 0} of {status.total_sessions} sessions active
          </div>
        </div>
      )}
      <div className="ec-divider" />
      <div className="ec-sessions-activity-title">Recent Activity</div>
      <div className="ec-sessions-list">
        {hasToken && isActive ? (
          recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <div key={activity.id} className="ec-session-item" style={activity.isDimmed ? { opacity: 0.6 } : undefined}>
                <div className={`ec-session-dot status-dot ${activity.dotClass || "dot-muted"}`} />
                <div className="ec-session-avatar">{activity.initials}</div>
                <div className="ec-session-info">
                  <div className="ec-session-name">{activity.name}</div>
                  <div className="ec-session-status-text">{activity.statusText}</div>
                </div>
                <div className="ec-session-time" title={activity.latestAt ? fmtDate(activity.latestAt) : undefined}>
                  {activity.timeText}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted" style={{ padding: "12px 0" }}>
              No recent juror activity yet.
            </div>
          )
        ) : (
          <div className="text-sm text-muted" style={{ padding: "12px 0" }}>
            No active token.
          </div>
        )}
      </div>
    </div>
  );
}
