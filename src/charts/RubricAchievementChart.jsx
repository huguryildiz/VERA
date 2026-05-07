// src/charts/RubricAchievementChart.jsx
// Stacked bar chart: rubric performance band breakdown per criterion.
// Uses recharts BarChart (stacked).

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Award } from "lucide-react";

export const BAND_COLORS = {
  excellent: "#22c55e",
  good: "#a3e635",
  developing: "#f59e0b",
  insufficient: "#ef4444",
};

const BAND_LABELS = ["excellent", "good", "developing", "insufficient"];

function WrappedTick({ x, y, payload }) {
  const text = String(payload?.value ?? "");
  const parts = text.split(" ");
  const lines = [];
  if (parts.length === 1 || text.length <= 10) {
    lines.push(text);
  } else {
    const mid = Math.ceil(parts.length / 2);
    lines.push(parts.slice(0, mid).join(" "));
    lines.push(parts.slice(mid).join(" "));
  }
  return (
    <g transform={`translate(${x},${y + 4})`}>
      {lines.map((ln, i) => (
        <text
          key={i}
          x={0}
          y={i * 11}
          dy={10}
          textAnchor="middle"
          fill="var(--text-tertiary)"
          style={{ fontSize: 10 }}
        >
          {ln}
        </text>
      ))}
    </g>
  );
}

function classifyValue(v, rubric) {
  if (!Number.isFinite(v) || !rubric?.length) return null;
  for (const band of rubric) {
    if (v >= band.min && v <= band.max) return band.level?.toLowerCase() ?? null;
  }
  return null;
}

/**
 * @param {object} props
 * @param {object[]} props.submittedData — score rows
 */
export function RubricAchievementChart({ submittedData = [], criteria = [] }) {
  const rows = submittedData || [];

  if (!rows.length) return (
    <div className="vera-es-no-data" style={{ height: 240, justifyContent: "center" }}>
      <div className="vera-es-ghost-rows" aria-hidden="true" style={{ marginBottom: 20 }}>
        <div className="vera-es-ghost-row">
          <div className="vera-es-ghost-bar" style={{ width: "20%" }} /><div className="vera-es-ghost-bar" style={{ width: "30%" }} /><div className="vera-es-ghost-spacer" /><div className="vera-es-ghost-bar" style={{ width: "14%" }} />
        </div>
        <div className="vera-es-ghost-row">
          <div className="vera-es-ghost-bar" style={{ width: "14%" }} /><div className="vera-es-ghost-bar" style={{ width: "24%" }} /><div className="vera-es-ghost-spacer" /><div className="vera-es-ghost-bar" style={{ width: "20%" }} />
        </div>
      </div>
      <div className="vera-es-icon"><Award size={22} strokeWidth={1.8} /></div>
      <p className="vera-es-no-data-title">No Score Data</p>
      <p className="vera-es-no-data-desc">Rubric band breakdown will appear once jurors submit evaluations.</p>
    </div>
  );

  const data = (criteria || []).map((c) => {
    const vals = rows.map((r) => Number(r[c.id])).filter((v) => Number.isFinite(v));
    const counts = Object.fromEntries(BAND_LABELS.map((k) => [k, 0]));
    vals.forEach((v) => {
      const k = classifyValue(v, c.rubric);
      if (k && k in counts) counts[k] += 1;
    });
    const total = vals.length || 1;
    return {
      name: c.label,
      excellent: Math.round((counts.excellent / total) * 100),
      good: Math.round((counts.good / total) * 100),
      developing: Math.round((counts.developing / total) * 100),
      insufficient: Math.round((counts.insufficient / total) * 100),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 14 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          interval={0}
          tick={<WrappedTick />}
          axisLine={false}
          tickLine={false}
          height={36}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          cursor={false}
          formatter={(v, name) => [`${v}%`, name.charAt(0).toUpperCase() + name.slice(1)]}
        />
        {BAND_LABELS.map((band) => (
          <Bar
            key={band}
            dataKey={band}
            name={band}
            stackId="a"
            fill={BAND_COLORS[band]}
            maxBarSize={40}
          />
        ))}
        <Legend
          iconType="square"
          iconSize={7}
          formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
          wrapperStyle={{ fontSize: 10, paddingTop: 8, color: "var(--text-secondary)" }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
