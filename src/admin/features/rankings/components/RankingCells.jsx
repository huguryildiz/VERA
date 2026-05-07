import { Icon } from "lucide-react";

export function HeatCell({ value, max, color, label }) {
  if (value == null) {
    return (
      <td className="heat-cell">
        <span className="heat-val">—</span>
      </td>
    );
  }
  return (
    <td className="heat-cell">
      <span className="heat-val" style={{ color }}>{value.toFixed(1)}</span>
    </td>
  );
}

export function ConsensusBadge({ consensus }) {
  if (!consensus) return null;
  const { level, sigma, min, max } = consensus;
  const label = level === "high" ? "High" : level === "moderate" ? "Moderate" : "Disputed";
  return (
    <>
      <span className={`consensus-badge consensus-${level}`}>{label}</span>
      <span className={`consensus-sub consensus-sub-${level}`}>
        <span className="consensus-sub-sigma">σ = {sigma}</span>
        <span className="consensus-sub-sep" />
        <span className="consensus-sub-range">range {min}–{max}</span>
      </span>
    </>
  );
}

export const RANK_GRADIENTS = {
  1: "linear-gradient(135deg, #92400e, #f59e0b)",
  2: "linear-gradient(135deg, #334155, #94a3b8)",
  3: "linear-gradient(135deg, #7c3f1a, #cd7c5a)",
};

const RANK_HONORABLE = { background: "var(--accent)", color: "#fff", border: "none" };

export function MedalCell({ rank }) {
  const gradient = RANK_GRADIENTS[rank];
  const honorable = !gradient && rank <= 5 ? RANK_HONORABLE : undefined;
  return (
    <span
      className="ranking-num"
      style={gradient ? { background: gradient, color: "#fff", border: "none" } : honorable}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}

export const DownloadIcon = ({ size = 14, style }) => (
  <Icon
    iconNode={[]}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Icon>
);
