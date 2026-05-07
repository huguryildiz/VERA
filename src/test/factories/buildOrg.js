let _seq = 1;

export function buildOrg(overrides = {}) {
  const n = _seq++;
  return {
    id: `org-${String(n).padStart(3, "0")}`,
    name: `Test University ${n}`,
    slug: `test-uni-${n}`,
    plan: "pro",
    setup_completed_at: "2025-09-01T10:00:00Z",
    created_at: "2025-09-01T09:00:00Z",
    ...overrides,
  };
}
