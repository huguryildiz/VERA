// src/charts/SubmissionTimelineChart.jsx
// Overview: Submission activity timeline — juror activity bucketed by hour.
// Recharts AreaChart. Takes allJurors with lastSeenMs timestamps.
// Mirrors prototype "chart-timeline" (Chart.js line chart with cumulative submissions).

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * Build hourly activity buckets from juror lastSeenMs timestamps.
 * Groups all seen jurors by hour within the same calendar day.
 * Falls back to cumulative mock shape when no real timestamps are available.
 *
 * @param {object[]} jurors — allJurors array with lastSeenMs
 * @returns {Array<{label: string, count: number, cumulative: number}>}
 */
function buildTimelineBuckets(jurors) {
  const seen = jurors.filter((j) => (j.lastSeenMs || 0) > 0);
  if (!seen.length) return [];

  // Find the most recent activity day as the reference day
  const latestMs = Math.max(...seen.map((j) => j.lastSeenMs));
  const refDate = new Date(latestMs);
  const refDay = refDate.toDateString();

  // Filter jurors active on the same day and bucket by hour
  const sameDay = seen.filter((j) => new Date(j.lastSeenMs).toDateString() === refDay);
  if (!sameDay.length) return [];

  const minHour = Math.min(...sameDay.map((j) => new Date(j.lastSeenMs).getHours()));
  const maxHour = Math.max(...sameDay.map((j) => new Date(j.lastSeenMs).getHours()));

  const buckets = {};
  for (let h = minHour; h <= maxHour; h++) {
    buckets[h] = 0;
  }
  sameDay.forEach((j) => {
    const h = new Date(j.lastSeenMs).getHours();
    buckets[h] = (buckets[h] || 0) + 1;
  });

  // Build cumulative series
  const hours = Object.keys(buckets).map(Number).sort((a, b) => a - b);
  let cumulative = 0;
  return hours.map((h) => {
    cumulative += buckets[h];
    return {
      label: `${String(h).padStart(2, "0")}:00`,
      count: buckets[h],
      cumulative,
    };
  });
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
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
      <div>Active: <strong>{payload[0]?.value}</strong></div>
      {payload[1] && <div>Cumulative: <strong>{payload[1]?.value}</strong></div>}
    </div>
  );
};

/**
 * @param {object} props
 * @param {object[]} props.allJurors — array with lastSeenMs timestamps
 */
export function SubmissionTimelineChart({ allJurors = [] }) {
  const data = useMemo(() => buildTimelineBuckets(allJurors), [allJurors]);

  if (!data.length) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, color: "var(--text-tertiary)", fontSize: 12 }}>
        No activity data for current period
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
          <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--success)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="var(--success)" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
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
        {/* Cumulative line (secondary) */}
        <Area
          type="monotone"
          dataKey="cumulative"
          name="Cumulative"
          stroke="var(--success)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          fill="url(#cumulativeGradient)"
          dot={false}
        />
        {/* Per-hour activity (primary) */}
        <Area
          type="monotone"
          dataKey="count"
          name="Active jurors"
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
