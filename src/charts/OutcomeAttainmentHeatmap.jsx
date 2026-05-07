// src/charts/OutcomeAttainmentHeatmap.jsx
// Heatmap: outcomes (rows) × evaluation periods (columns).
// Cell color = attainment rate; secondary label = avg score.
// Colors live in charts.css (.hm-cell--*) so they adapt to light/dark theme.

import { TrendingUp } from "lucide-react";

/** Returns the CSS modifier class for a given attainment rate. */
function attainmentClass(rate) {
  if (rate == null) return "hm-cell--none";
  if (rate >= 90) return "hm-cell--green";
  if (rate >= 80) return "hm-cell--lime";
  if (rate >= 70) return "hm-cell--yellow";
  if (rate >= 50) return "hm-cell--orange";
  return "hm-cell--red";
}

/**
 * @param {object}   props
 * @param {object[]} props.rows        — from buildOutcomeAttainmentTrendDataset().rows
 * @param {object[]} props.outcomeMeta — from buildOutcomeAttainmentTrendDataset().outcomeMeta
 */
export function OutcomeAttainmentHeatmap({ rows = [], outcomeMeta = [] }) {
  if (!rows.length || !outcomeMeta.length) return (
    <div className="vera-es-no-data">
      <div className="vera-es-ghost-rows" aria-hidden="true">
        <div className="vera-es-ghost-row">
          <div className="vera-es-ghost-bar" style={{ width: "22%" }} /><div className="vera-es-ghost-bar" style={{ width: "16%" }} /><div className="vera-es-ghost-spacer" /><div className="vera-es-ghost-bar" style={{ width: "16%" }} /><div className="vera-es-ghost-bar" style={{ width: "16%" }} />
        </div>
        <div className="vera-es-ghost-row">
          <div className="vera-es-ghost-bar" style={{ width: "18%" }} /><div className="vera-es-ghost-bar" style={{ width: "20%" }} /><div className="vera-es-ghost-spacer" /><div className="vera-es-ghost-bar" style={{ width: "16%" }} /><div className="vera-es-ghost-bar" style={{ width: "16%" }} />
        </div>
      </div>
      <div className="vera-es-icon"><TrendingUp size={22} strokeWidth={1.8} /></div>
      <p className="vera-es-no-data-title">No Attainment History</p>
      <p className="vera-es-no-data-desc">Outcome attainment across periods will appear once data is available.</p>
    </div>
  );

  return (
    <div className="outcome-attainment-wrap">
      <table
        className="outcome-attainment-table table-dense table-like"
        style={{ minWidth: Math.max(400, 220 + rows.length * 100) }}
      >
        <colgroup>
          <col style={{ width: 220, minWidth: 220 }} />
          {rows.map((r) => <col key={r.period} style={{ minWidth: 90 }} />)}
        </colgroup>
        <thead>
          <tr>
            <th className="outcome-attainment-head outcome-attainment-head--left">
              Outcome
            </th>
            {rows.map((r) => (
              <th key={r.period} className="outcome-attainment-head">
                {r.period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {outcomeMeta.map((o) => (
            <tr key={o.code}>
              {/* Outcome label */}
              <td className="outcome-attainment-label">
                <div className="oat-cell">
                  <span className="oat-code">{o.code}</span>
                  {o.label && <span className="oat-desc">{o.label}</span>}
                </div>
              </td>
              {rows.map((r) => {
                const att = r[o.attKey];
                const avg = r[o.avgKey];
                return (
                  <td
                    key={r.period}
                    className={`hm-cell ${attainmentClass(att)}`}
                    title={att != null
                      ? `Attainment: ${att}%  |  Avg score: ${avg != null ? avg + "%" : "—"}`
                      : "No data"}
                  >
                    {att != null ? (
                      <>
                        <div className="hm-cell__value">{att}%</div>
                        {avg != null && (
                          <div className="hm-cell__avg">avg {avg}%</div>
                        )}
                      </>
                    ) : (
                      <span className="outcome-attainment-empty">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Color scale legend */}
      <div style={{
        display: "flex",
        gap: 12,
        justifyContent: "center",
        marginTop: 14,
        flexWrap: "wrap",
      }}>
        {[
          { label: "≥ 90%", cls: "hm-cell--green" },
          { label: "80–90%", cls: "hm-cell--lime" },
          { label: "70–80%", cls: "hm-cell--yellow" },
          { label: "50–70%", cls: "hm-cell--orange" },
          { label: "< 50%", cls: "hm-cell--red" },
          { label: "No data", cls: "hm-cell--none" },
        ].map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className={`hm-cell ${s.cls}`} style={{
              display: "inline-block",
              width: 16,
              height: 12,
              borderRadius: 3,
              padding: 0,
            }} />
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
