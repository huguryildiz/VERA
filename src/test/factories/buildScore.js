let _seq = 1;

export function buildScore(overrides = {}) {
  const n = _seq++;
  return {
    id: `score-${String(n).padStart(3, "0")}`,
    juror_id: "juror-001",
    project_id: "project-001",
    period_id: "period-001",
    criterion_id: `crit-${String(n).padStart(3, "0")}`,
    written: 80,
    oral: 85,
    created_at: "2025-12-02T10:30:00Z",
    updated_at: "2025-12-02T10:30:00Z",
    ...overrides,
  };
}
