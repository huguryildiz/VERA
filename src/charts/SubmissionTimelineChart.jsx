// src/charts/SubmissionTimelineChart.jsx
// Overview: Submission timeline — one data point per juror's finalSubmittedAt.
// Recharts AreaChart, single cumulative series. Each dot = one real submit moment.

import { useMemo } from "react";
import { LineChart } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function RotatedTick({ x, y, payload }) {
  const parts = payload.value.split(" ");
  // parts: ["13", "Jun", "2026", "14:33"]
  const dateLine = parts.slice(0, 3).join(" ");
  const timeLine = parts[3] ?? "";
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        textAnchor="end"
        fill="var(--text-tertiary)"
        fontSize={9}
        fontFamily="var(--mono)"
        fontWeight={400}
        letterSpacing="-0.01em"
        style={{ fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum" 1' }}
        transform="rotate(-35)"
      >
        <tspan x={0} dy="0">{dateLine}</tspan>
        <tspan x={0} dy="11">{timeLine}</tspan>
      </text>
    </g>
  );
}

/**
 * One point per submitted juror, sorted by finalSubmittedAt ascending.
 * Cumulative = 1-based index after sort.
 * Label format: "14 Jun 2026 14:33" (minute-precision so co-submits are still
 * distinguishable on the axis when they happen seconds apart).
 *
 * @param {object[]} jurors — allJurors array with finalSubmittedAt
 * @returns {Array<{label: string, ts: number, cumulative: number}>}
 */
function buildTimelinePoints(jurors) {
  const submitted = jurors
    .filter((j) => j.finalSubmittedAt)
    .map((j) => ({ ts: new Date(j.finalSubmittedAt).getTime() }))
    .sort((a, b) => a.ts - b.ts);

  return submitted.map((p, i) => {
    const d = new Date(p.ts);
    const label = `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return { label, ts: p.ts, cumulative: i + 1 };
  });
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)",
      padding: "8px 10px",
      fontSize: 11,
      boxShadow: "var(--shadow-elevated)",
      color: "var(--text-primary)",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>{label}</div>
      <div>Submitted: <strong>{value}</strong></div>
    </div>
  );
};

/**
 * @param {object} props
 * @param {object[]} props.allJurors — array with lastSeenMs timestamps
 */
export function SubmissionTimelineChart({ allJurors = [] }) {
  const data = useMemo(() => buildTimelinePoints(allJurors), [allJurors]);

  if (!data.length) {
    return (
      <div className="vera-es-no-data" style={{ height: 240, justifyContent: "center" }}>
        <div className="vera-es-ghost-rows" aria-hidden="true" style={{ marginBottom: 20 }}>
          <div className="vera-es-ghost-row">
            <div className="vera-es-ghost-bar" style={{ width: "15%" }} />
            <div className="vera-es-ghost-bar" style={{ width: "30%" }} />
            <div className="vera-es-ghost-spacer" />
            <div className="vera-es-ghost-bar" style={{ width: "20%" }} />
          </div>
          <div className="vera-es-ghost-row">
            <div className="vera-es-ghost-bar" style={{ width: "20%" }} />
            <div className="vera-es-ghost-bar" style={{ width: "25%" }} />
            <div className="vera-es-ghost-spacer" />
            <div className="vera-es-ghost-bar" style={{ width: "12%" }} />
          </div>
        </div>
        <div className="vera-es-icon">
          <LineChart size={22} strokeWidth={1.8} />
        </div>
        <p className="vera-es-no-data-title">No Submission Data</p>
        <p className="vera-es-no-data-desc">Juror activity will appear here once evaluations begin for this period.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
        <defs>
          <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={<RotatedTick />}
          height={52}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="cumulative"
          name="Submitted"
          stroke="var(--accent)"
          strokeWidth={2}
          fill="url(#timelineGradient)"
          dot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
