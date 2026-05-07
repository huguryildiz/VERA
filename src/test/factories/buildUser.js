let _seq = 1;

export function buildUser(overrides = {}) {
  const n = _seq++;
  return {
    id: `user-${String(n).padStart(3, "0")}`,
    email: `user${n}@test.edu`,
    full_name: `Test User ${n}`,
    role: "tenant_admin",
    organization_id: "org-001",
    created_at: "2025-09-01T10:00:00Z",
    ...overrides,
  };
}
