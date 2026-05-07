let _seq = 1;

export function buildJuror(overrides = {}) {
  const n = _seq++;
  return {
    id: `juror-${String(n).padStart(3, "0")}`,
    organization_id: "org-001",
    full_name: `Test Juror ${n}`,
    email: `juror${n}@test.edu`,
    affiliation: `Test Dept ${n}`,
    pin: String(1000 + n),
    is_active: true,
    created_at: "2025-09-05T10:00:00Z",
    ...overrides,
  };
}
