// src/charts/ProgrammeAveragesChart.jsx
// Bar chart: grand mean (%) per criterion with 70% threshold reference.
// Uses recharts BarChart.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { mean, stdDev, outcomeValues } from "../shared/stats";
import { BarChart2 } from "lucide-react";

function fmt1(v) {
  return Math.round(v * 10) / 10;
}

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

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, pct, sd, color } = payload[0].payload;
  return (
    <div className="recharts-default-tooltip" style={{ minWidth: 140 }}>
      <p className="recharts-tooltip-label" style={{ color, marginBottom: 4 }}>{name}</p>
      <p style={{ fontSize: 11, color: "#cbd5e1", margin: 0 }}>
        Mean: <strong style={{ color }}>{pct}%</strong>
        {sd ? <span style={{ color: "#94a3b8" }}> ±{sd}%</span> : null}
      </p>
    </div>
  );
}

/**
 * @param {object} props
 * @param {object[]} props.submittedData — score rows
 */
export function ProgrammeAveragesChart({ submittedData = [], criteria = [], threshold = 70 }) {
  const rows = submittedData || [];

  if (!rows.length) return (
    <div className="vera-es-no-data" style={{ height: 240, justifyContent: "center" }}>
      <div className="vera-es-ghost-rows" aria-hidden="true" style={{ marginBottom: 20 }}>
        <div className="vera-es-ghost-row">
          <div className="vera-es-ghost-bar" style={{ width: "16%" }} /><div className="vera-es-ghost-bar" style={{ width: "28%" }} /><div className="vera-es-ghost-spacer" /><div className="vera-es-ghost-bar" style={{ width: "18%" }} />
        </div>
        <div className="vera-es-ghost-row">
          <div className="vera-es-ghost-bar" style={{ width: "22%" }} /><div className="vera-es-ghost-bar" style={{ width: "20%" }} /><div className="vera-es-ghost-spacer" /><div className="vera-es-ghost-bar" style={{ width: "12%" }} />
        </div>
      </div>
      <div className="vera-es-icon"><BarChart2 size={22} strokeWidth={1.8} /></div>
      <p className="vera-es-no-data-title">No Score Data</p>
      <p className="vera-es-no-data-desc">Programme criterion averages will appear once jurors submit evaluations.</p>
    </div>
  );

  const data = (criteria || []).map((c) => {
    const vals = outcomeValues(rows, c.id);
    const avgRaw = vals.length ? mean(vals) : 0;
    const pct = c.max > 0 ? fmt1((avgRaw / c.max) * 100) : 0;
    const sd = vals.length > 1 ? fmt1((stdDev(vals, true) / c.max) * 100) : 0;
    return { name: c.label, pct, sd, color: c.color };
  });

  const CustomBar = (props) => {
    const { x, y, width, height, color } = props;
    return <rect x={x} y={y} width={width} height={height} fill={color} rx={2} />;
  };

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
        <Tooltip cursor={false} content={<CustomTooltip />} />
        <ReferenceLine
          y={threshold}
          stroke="var(--text-tertiary)"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          label={{ value: "70%", position: "insideTopRight", fontSize: 9, fill: "var(--text-tertiary)" }}
        />
        <Bar dataKey="pct" maxBarSize={40} radius={[2, 2, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
