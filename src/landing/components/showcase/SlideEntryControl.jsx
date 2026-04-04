const QR_ROWS = [
  [1,1,1,1,1,0,1,0,1,1,1],
  [1,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,0,1,0,1,0,1,0,1],
  [1,0,0,0,1,0,0,1,1,0,1],
  [1,1,1,1,1,0,1,0,1,1,1],
  [0,0,0,0,0,0,1,0,0,0,0],
  [1,0,1,1,0,1,1,0,1,1,0],
  [1,1,1,1,1,0,0,1,0,1,0],
  [1,0,1,0,1,0,1,0,1,0,1],
  [1,0,0,0,1,0,0,1,0,0,1],
  [1,1,1,1,1,0,1,0,1,1,1],
];

const SESSIONS = [
  { initials: "EA", name: "Prof. E. Aslan", time: "2m ago", status: "Scoring", statusCls: "warn", color: "#3b82f6" },
  { initials: "MY", name: "Dr. M. Yilmaz", time: "5m ago", status: "Active", statusCls: "success", color: "#8b5cf6" },
  { initials: "SK", name: "A.Prof. S. Kaya", time: "12m ago", status: "Scoring", statusCls: "warn", color: "#ec4899" },
];

export default function SlideEntryControl() {
  return (
    <div className="ps-window">
      <div className="ps-toolbar">
        <div className="ps-toolbar-dots"><span /><span /><span /></div>
        <span className="ps-toolbar-label">entry-control</span>
      </div>
      <div className="ps-body">
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 14 }}>
          {/* QR */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 104, height: 104, background: "#fff", borderRadius: 8, padding: 6, position: "relative" }}>
              <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: "repeat(11,1fr)", gridTemplateRows: "repeat(11,1fr)", gap: 1 }}>
                {QR_ROWS.flat().map((cell, i) => (
                  <div key={i} style={{ background: cell ? "#111827" : "#fff", borderRadius: 1 }} />
                ))}
              </div>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 7, fontWeight: 800, color: "#3b82f6", background: "#fff", padding: "1px 3px", borderRadius: 2 }}>VERA</div>
            </div>
            <span style={{ fontSize: 8.5, color: "#64748b", fontWeight: 500 }}>Scan to join</span>
          </div>

          {/* Sessions */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "#94a3b8" }}>Active Sessions</span>
              <span style={{ fontSize: 9.5, color: "#4ade80", fontWeight: 500 }}>3 connected</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 66px 52px", gap: 6, paddingBottom: 5, borderBottom: "1px solid rgba(148,163,184,0.05)", marginBottom: 4 }}>
              <span style={{ fontSize: 8.5, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.3px" }}>Juror</span>
              <span style={{ fontSize: 8.5, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.3px" }}>Last seen</span>
              <span style={{ fontSize: 8.5, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.3px" }}>Status</span>
            </div>
            {SESSIONS.map((s) => (
              <div key={s.initials} style={{ display: "grid", gridTemplateColumns: "1fr 66px 52px", gap: 6, padding: "4px 0", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff", flexShrink: 0, background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)` }}>{s.initials}</div>
                  <span style={{ fontSize: 10.5, color: "#cbd5e1", fontWeight: 500 }}>{s.name}</span>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "#64748b" }}>{s.time}</span>
                <span className={`ps-badge ${s.statusCls}`}>{s.status}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 9.5, fontWeight: 500, padding: "3px 9px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4, color: "#4ade80", background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.1)" }}>● Token Active</span>
              <span style={{ fontSize: 9.5, fontWeight: 500, padding: "3px 9px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4, color: "#fbbf24", background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.08)" }}>⏱ 2h 30m left</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
