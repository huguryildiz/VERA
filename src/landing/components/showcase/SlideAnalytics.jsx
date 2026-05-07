export default function SlideAnalytics() {
  return (
    <div className="ps-window">
      <div className="ps-toolbar">
        <div className="ps-toolbar-dots"><span /><span /><span /></div>
        <span className="ps-toolbar-label">analytics</span>
      </div>
      <div className="ps-body">
        {/* KPI mini-cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
          {[
            { label: "Completion", value: "91%", delta: "+12%", up: true, accent: "rgba(59,130,246,0.5)" },
            { label: "Avg. Score", value: "78.4", delta: "+3.2", up: true, accent: "rgba(34,197,94,0.5)" },
            { label: "Pass Rate", value: "87%", delta: null, accent: "rgba(251,191,36,0.5)" },
            { label: "Jurors", value: "12", delta: "-2", up: false, accent: "rgba(139,92,246,0.5)" },
          ].map((k) => (
            <div key={k.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.06)", borderRadius: 8, padding: 10, position: "relative", overflow: "hidden", borderTop: `2px solid ${k.accent}` }}>
              <div style={{ fontSize: 9.5, color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>{k.label}</div>
              <div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>{k.value}</span>
                {k.delta && (
                  <span style={{ fontSize: 9, fontWeight: 600, marginLeft: 4, padding: "1px 5px", borderRadius: 6, color: k.up ? "#4ade80" : "#f87171", background: k.up ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)" }}>{k.delta}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 100, paddingTop: 4 }}>
          {[
            { label: "SmartGrid", score: "91.2", h: "91%", color: "linear-gradient(180deg,#4ade80,#16a34a)" },
            { label: "MedAlert", score: "88.7", h: "86%", color: "linear-gradient(180deg,#4ade80,#22c55e)" },
            { label: "EcoTrack", score: "82.1", h: "76%", color: "linear-gradient(180deg,#60a5fa,#3b82f6)" },
            { label: "AutoDrive", score: "79.5", h: "70%", color: "linear-gradient(180deg,#60a5fa,#2563eb)" },
            { label: "RoboArm", score: "74.3", h: "62%", color: "linear-gradient(180deg,#fbbf24,#d97706)" },
            { label: "DataVault", score: "68.9", h: "52%", color: "linear-gradient(180deg,#fbbf24,#b45309)" },
          ].map((b) => (
            <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 600, color: "#cbd5e1" }}>{b.score}</span>
              <div style={{ width: "100%", height: b.h, background: b.color, borderRadius: "3px 3px 1px 1px", minHeight: 6 }} />
              <span style={{ fontSize: 8.5, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 65, textAlign: "center" }}>{b.label}</span>
            </div>
          ))}
        </div>

        {/* Outcome pills */}
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {[
            { code: "PO-1", pct: "84%", cls: "met" },
            { code: "PO-2", pct: "79%", cls: "met" },
            { code: "PO-3", pct: "68%", cls: "bord" },
            { code: "PO-4", pct: "91%", cls: "met" },
            { code: "PO-5", pct: "76%", cls: "met" },
            { code: "PO-6", pct: "52%", cls: "notm" },
          ].map((o) => (
            <div key={o.code} style={{ fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(148,163,184,0.06)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontFamily: "var(--mono)", fontWeight: 600, color: "#93c5fd" }}>{o.code}</span>
              <span style={{ fontFamily: "var(--mono)", fontWeight: 600, color: o.cls === "met" ? "#4ade80" : o.cls === "bord" ? "#fbbf24" : "#f87171" }}>{o.pct}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
