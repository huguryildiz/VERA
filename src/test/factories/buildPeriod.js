let _seq = 1;

export function buildPeriod(overrides = {}) {
  const n = _seq++;
  return {
    id: `period-${String(n).padStart(3, "0")}`,
    organization_id: "org-001",
    name: `Test Period ${n}`,
    semester: `2025-fall-${n}`,
    status: "active",
    framework: "MUDEK",
    eval_start: "2025-12-01T09:00:00Z",
    eval_end: "2025-12-15T18:00:00Z",
    created_at: "2025-09-10T10:00:00Z",
    ...overrides,
  };
}
