import { ACTIVITY_FEED } from "./showcaseData";

const KPI = [
  { label: "Active Jurors", value: "12", accent: "#3b82f6" },
  { label: "Projects", value: "24", accent: "#22c55e" },
  { label: "Completion", value: "91%", delta: "+12%", accent: "#f59e0b" },
  { label: "Avg Score", value: "78.4", delta: "+3.2", accent: "#8b5cf6" },
];

export default function SlideOverview() {
  return (
    <div className="ps-window">
      <div className="ps-toolbar">
        <div className="ps-toolbar-dots"><span /><span /><span /></div>
        <span className="ps-toolbar-label">Overview — Spring 2025</span>
      </div>
      <div className="ps-body">
        {/* KPI strip */}
        <div className="ps-kpi-strip">
          {KPI.map((k) => (
            <div key={k.label} className="ps-kpi-card">
              <div className="ps-kpi-accent" style={{ background: `linear-gradient(90deg, ${k.accent}, ${k.accent}99)` }} />
              <div className="ps-kpi-label">{k.label}</div>
              <div className="ps-kpi-row">
                <span className="ps-kpi-value">{k.value}</span>
                {k.delta && <span className="ps-kpi-delta">{k.delta}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Activity feed */}
        <div className="ps-feed">
          <div className="ps-feed-header">
            <span className="ps-feed-title">Live Activity</span>
            <span className="ps-badge success">Live</span>
          </div>
          {ACTIVITY_FEED.map((a, i) => (
            <div key={i} className="ps-feed-row">
              <div className="ps-feed-avatar" style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)` }}>{a.initials}</div>
              <div className="ps-feed-text">
                <span className="ps-feed-who">{a.who}</span>
                <span className="ps-feed-action">{a.action}</span>
              </div>
              <span className="ps-feed-time">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
