import { AlertTriangle, CheckCircle, Circle } from "lucide-react";

export function coverageBadgeClass(type) {
  if (type === "direct") return "acc-coverage direct";
  if (type === "indirect") return "acc-coverage indirect acc-coverage-toggle";
  return "acc-coverage none acc-coverage-toggle";
}

export function coverageLabel(type) {
  if (type === "direct") return "Direct";
  if (type === "indirect") return "Indirect";
  return "Unmapped";
}

export const COVERAGE_LEGEND = [
  {
    key: "direct",
    label: "Direct",
    desc: "Assessed through mapped evaluation criteria. Attainment is calculated from jury scores.",
    icon: CheckCircle,
    cls: "direct",
  },
  {
    key: "indirect",
    label: "Indirect",
    desc: "Assessed outside VERA through external instruments (surveys, alumni feedback, etc.). Include results in your self-evaluation report.",
    icon: AlertTriangle,
    cls: "indirect",
  },
  {
    key: "none",
    label: "Unmapped",
    desc: "No assessment method assigned. Map criteria for direct assessment, or mark as indirect if assessed externally.",
    icon: Circle,
    cls: "unmapped",
  },
];

export function naturalCodeSort(a, b) {
  const isCopy = (code) => /\(copy\)/i.test(code);
  const normalize = (code) => code.replace(/^[A-Za-z]+\s*/, "").replace(/\s*\(copy\)/i, "").trim();
  const aParts = normalize(a.code).split(".").map(Number);
  const bParts = normalize(b.code).split(".").map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return Number(isCopy(a.code)) - Number(isCopy(b.code));
}
