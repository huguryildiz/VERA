// src/charts/OutcomeByGroupChart.jsx
// Grouped bar chart: average score per criterion per project group.
// Uses recharts BarChart.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { CRITERIA } from "../config";

const ATTAINMENT_THRESHOLD = 70;

/**
 * @param {object} props
 * @param {object[]} props.dashboardStats — array of { id, name, count, avg: { technical, design, delivery, teamwork } }
 */
export function OutcomeByGroupChart({ dashboardStats = [] }) {
  const groups = (dashboardStats || []).filter((s) => s.count > 0);

  const data = groups.map((g) => {
    const row = { name: g.title || g.name || g.id };
    CRITERIA.forEach((c) => {
      const raw = Number(g.avg?.[c.id] ?? 0);
      row[c.id] = c.max > 0 ? Math.round((raw / c.max) * 1000) / 10 : 0;
    });
    return row;
  });

  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={260}>
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
          formatter={(v, name) => [`${v}%`, name]}
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
          strokeWidth={1}
        />
        {CRITERIA.map((c) => (
          <Bar key={c.id} dataKey={c.id} name={c.shortLabel} fill={c.color} radius={[2, 2, 0, 0]} maxBarSize={18} />
        ))}
        <Legend
          iconType="square"
          iconSize={7}
          wrapperStyle={{ fontSize: 10, paddingTop: 8, color: "var(--text-secondary)" }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
