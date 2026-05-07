export default function SlideJuryFlow() {
  return (
    <div className="ps-window">
      <div className="ps-toolbar">
        <div className="ps-toolbar-dots"><span /><span /><span /></div>
        <span className="ps-toolbar-label">jury / scoring</span>
      </div>
      <div className="ps-body">
        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 7, fontSize: 10.5, fontWeight: 500, color: "#4ade80", background: "rgba(34,197,94,0.08)" }}>✓ Identity</div>
          <span style={{ color: "#334155", margin: "0 3px", fontSize: 9 }}>→</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 7, fontSize: 10.5, fontWeight: 500, color: "#4ade80", background: "rgba(34,197,94,0.08)" }}>✓ PIN Auth</div>
          <span style={{ color: "#334155", margin: "0 3px", fontSize: 9 }}>→</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 7, fontSize: 10.5, fontWeight: 500, color: "#93c5fd", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>● Scoring</div>
          <span style={{ color: "#334155", margin: "0 3px", fontSize: 9 }}>→</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 7, fontSize: 10.5, fontWeight: 500, color: "#475569" }}>Done</div>
        </div>

        {/* Scoring card */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(148,163,184,0.05)", borderRadius: 9, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>EE-03: EcoTrack Sensors</span>
            <div style={{ display: "flex", gap: 5 }}>
              <span className="ps-badge success">Autosaved</span>
              <span className="ps-badge info">8 / 24 scored</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              { label: "Technical", color: "#f59e0b", val: 25, max: 30 },
              { label: "Design", color: "#22c55e", val: 22, max: 30 },
              { label: "Delivery", color: "#3b82f6", val: 27, max: 30 },
              { label: "Teamwork", color: "#ef4444", val: 8, max: 10 },
            ].map((c) => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 10.5, fontWeight: 500, width: 62, flexShrink: 0, color: c.color }}>{c.label}</span>
                <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(c.val / c.max) * 100}%`, borderRadius: 3, background: `linear-gradient(90deg, ${c.color}, ${c.color}cc)` }} />
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600, color: "#cbd5e1", width: 40, textAlign: "right" }}>{c.val} / {c.max}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
