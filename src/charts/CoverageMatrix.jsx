// src/charts/CoverageMatrix.jsx
// HTML table: Outcome × Assessment Tool coverage matrix.
// Shows which MÜDEK outcomes are directly/indirectly measured by VERA criteria.

import { CRITERIA } from "../config";

// MÜDEK 2024 outcome list (all 18 outcomes)
const MUDEK_OUTCOMES = [
  { code: "1.1", label: "Mathematics & science knowledge" },
  { code: "1.2", label: "Apply knowledge to complex problems" },
  { code: "2",   label: "Problem identification & analysis" },
  { code: "3.1", label: "Creative engineering solutions" },
  { code: "3.2", label: "Design under realistic constraints" },
  { code: "4",   label: "Modern engineering tools" },
  { code: "5",   label: "Research methods" },
  { code: "6.1", label: "Societal impact awareness" },
  { code: "6.2", label: "Legal consequences awareness" },
  { code: "7.1", label: "Professional & ethical conduct" },
  { code: "7.2", label: "Non-discrimination & inclusivity" },
  { code: "8.1", label: "Intra-disciplinary teamwork" },
  { code: "8.2", label: "Multi-disciplinary teamwork" },
  { code: "9.1", label: "Oral communication" },
  { code: "9.2", label: "Written communication" },
  { code: "10.1", label: "Project management" },
  { code: "10.2", label: "Entrepreneurship" },
  { code: "11",  label: "Lifelong learning" },
];

// Indirect coverage: these outcome codes are tangentially assessed
const INDIRECT_CODES = new Set(["4", "5", "7.1"]);

function getCoverageType(outcomeCode, criterionId) {
  const criterion = CRITERIA.find((c) => c.id === criterionId);
  if (!criterion) return "none";
  const mudek = criterion.mudek || [];
  if (mudek.includes(outcomeCode)) return "direct";
  if (INDIRECT_CODES.has(outcomeCode) && criterionId === "technical") return "indirect";
  if (outcomeCode === "7.1" && criterionId === "teamwork") return "indirect";
  return "none";
}

function CoverageChip({ type }) {
  if (type === "direct") return <span className="coverage-chip direct">✓ Direct</span>;
  if (type === "indirect") return <span className="coverage-chip indirect">∼ Indirect</span>;
  return <span className="coverage-chip none">—</span>;
}

export function CoverageMatrix() {
  let directCount = 0;
  let indirectCount = 0;
  let unmappedCount = 0;

  const rows = MUDEK_OUTCOMES.map((outcome) => {
    const coverages = CRITERIA.map((c) => getCoverageType(outcome.code, c.id));
    const overall = coverages.includes("direct")
      ? "direct"
      : coverages.includes("indirect")
      ? "indirect"
      : "none";

    if (overall === "direct") directCount++;
    else if (overall === "indirect") indirectCount++;
    else unmappedCount++;

    return { outcome, coverages, overall };
  });

  return (
    <>
      <table className="coverage-matrix">
        <thead>
          <tr>
            <th>Outcome</th>
            {CRITERIA.map((c) => <th key={c.id}>{c.shortLabel}</th>)}
            <th>Coverage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ outcome, coverages, overall }) => (
            <tr key={outcome.code}>
              <td>
                <span className="cm-code">{outcome.code}</span>{" "}
                {outcome.label}
              </td>
              {coverages.map((type, i) => (
                <td key={i}><CoverageChip type={type} /></td>
              ))}
              <td><CoverageChip type={overall} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="coverage-summary">
        <div className="coverage-summary-stat">
          <span className="stat-num direct">{directCount}</span> Direct assessment
        </div>
        <div className="coverage-summary-stat">
          <span className="stat-num indirect">{indirectCount}</span> Indirect evidence
        </div>
        <div className="coverage-summary-stat">
          <span className="stat-num unmapped">{unmappedCount}</span> Not mapped — requires other instruments
        </div>
      </div>
    </>
  );
}
