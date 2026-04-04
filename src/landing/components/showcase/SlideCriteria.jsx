const CRITERIA = [
  { cls: "t", name: "Technical Competence", range: "0–30 pts · 30%", color: "#f59e0b" },
  { cls: "d", name: "Written Communication", range: "0–30 pts · 30%", color: "#22c55e" },
  { cls: "o", name: "Oral Presentation", range: "0–30 pts · 30%", color: "#3b82f6" },
  { cls: "tw", name: "Teamwork & Collaboration", range: "0–10 pts · 10%", color: "#ef4444" },
];

const BANDS = ["#22c55e", "#84cc16", "#eab308", "#ef4444"];

const MAPPINGS = [
  { code: "PO 1.2", criteria: [{ name: "Technical", color: "#f59e0b" }, { name: "Written", color: "#22c55e" }], type: "Direct" },
  { code: "PO 3.1", criteria: [{ name: "Oral", color: "#3b82f6" }], type: "Direct" },
  { code: "PO 9.1", criteria: [{ name: "Teamwork", color: "#ef4444" }], type: "Indirect" },
];

export default function SlideCriteria() {
  return (
    <div className="ps-window">
      <div className="ps-toolbar">
        <div className="ps-toolbar-dots"><span /><span /><span /></div>
        <span className="ps-toolbar-label">criteria & outcomes</span>
      </div>
      <div className="ps-body">
        {/* Criteria cards 2x2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {CRITERIA.map((c) => (
            <div key={c.cls} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(148,163,184,0.05)", borderRadius: 7, padding: 10, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: c.color }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", marginBottom: 3 }}>{c.name}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "#64748b", marginBottom: 5 }}>{c.range}</div>
              <div style={{ display: "flex", gap: 2 }}>
                {BANDS.map((bg, i) => (
                  <div key={i} style={{ flex: 1, height: 3.5, borderRadius: 2, background: bg }} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Outcome mapping */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(148,163,184,0.05)", borderRadius: 7, padding: 10 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 7 }}>Outcome Mapping</div>
          {MAPPINGS.map((m) => (
            <div key={m.code} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 10.5, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 600, color: "#93c5fd", background: "rgba(59,130,246,0.07)", padding: "2px 6px", borderRadius: 3 }}>{m.code}</span>
              <span style={{ color: "#334155", fontSize: 9 }}>→</span>
              {m.criteria.map((cr) => (
                <span key={cr.name} style={{ fontSize: 9.5, fontWeight: 500, padding: "2px 6px", borderRadius: 3, color: cr.color, background: `${cr.color}12` }}>{cr.name}</span>
              ))}
              <span style={{ fontSize: 8.5, fontWeight: 600, padding: "1px 5px", borderRadius: 3, marginLeft: "auto", color: m.type === "Direct" ? "#4ade80" : "#fbbf24", background: m.type === "Direct" ? "rgba(34,197,94,0.07)" : "rgba(251,191,36,0.07)" }}>{m.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
