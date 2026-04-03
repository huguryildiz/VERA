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
import { CRITERIA } from "../config";
import { mean, stdDev, outcomeValues } from "../shared/stats";

const ATTAINMENT_THRESHOLD = 70;

function fmt1(v) {
  return Math.round(v * 10) / 10;
}

/**
 * @param {object} props
 * @param {object[]} props.submittedData — score rows
 */
export function ProgrammeAveragesChart({ submittedData = [] }) {
  const rows = submittedData || [];

  const data = CRITERIA.map((c) => {
    const vals = outcomeValues(rows, c.id);
    const avgRaw = vals.length ? mean(vals) : 0;
    const pct = c.max > 0 ? fmt1((avgRaw / c.max) * 100) : 0;
    const sd = vals.length > 1 ? fmt1((stdDev(vals, true) / c.max) * 100) : 0;
    return { name: c.shortLabel, pct, sd, color: c.color };
  });

  const CustomBar = (props) => {
    const { x, y, width, height, color } = props;
    return <rect x={x} y={y} width={width} height={height} fill={color} rx={2} />;
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          axisLine={false}
          tickLine={false}
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
          formatter={(v, name, props) => {
            const sd = props?.payload?.sd;
            return [`${v}%${sd ? ` ±${sd}%` : ""}`, "Mean"];
          }}
          contentStyle={{
            fontSize: 11,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-elevated)",
          }}
        />
        <ReferenceLine
          y={ATTAINMENT_THRESHOLD}
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
