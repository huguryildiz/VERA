/**
 * Canonical source of hardcoded UUIDs shared across E2E specs.
 * All IDs here refer to rows in the demo Supabase database.
 * Edit this file (not individual specs) when demo seed changes.
 *
 * Org UUIDs were resynced 2026-04-25 to match the real demo seed
 * (sql/seeds/demo_seed.sql) instead of the legacy `b2c3d4e5...`
 * placeholder set that no longer exists in vera-demo.
 */

// ── Organizations ──────────────────────────────────────────────────────────
/** Main demo org used for rankings, periods, tenant-admin, tenant-application tests
 *  → TED University — Electrical-Electronics Engineering */
export const E2E_PERIODS_ORG_ID = "e802a6cb-6cfa-4a7c-aba6-2038490fb899";

/** Second org used for projects import, cross-tenant isolation probes
 *  → Carnegie Mellon University — Computer Science */
export const E2E_PROJECTS_ORG_ID = "b94595d6-710c-4302-ad1b-11f4d216e028";

/** Org with a 3-state period lifecycle (published → open → closed)
 *  → TEKNOFEST */
export const E2E_LIFECYCLE_ORG_ID = "d8214e32-d30f-4a0c-aee5-1c6fa0d41336";

/** Org used for setup-wizard tests (setup_completed_at = null).
 *  NOTE: vera-demo has no setup-pending org; wizard specs may need to
 *  create their own org or be reseeded. Kept as TÜBİTAK placeholder
 *  so the symbol resolves; tests that hard-require setup_pending=true
 *  will still need a fixture-side fix. */
export const E2E_WIZARD_ORG_ID = "088f5054-c9df-4c7f-a679-c1321524f250";

/** Demo org ID (same as E2E_PERIODS_ORG_ID; kept as alias for clarity in tenant-application tests) */
export const DEMO_ORG_ID = E2E_PERIODS_ORG_ID;

/** Org used by criteria / pin-blocking / outcomes tests
 *  → IEEE APS — AP-S Student Design Contest */
export const E2E_CRITERIA_ORG_ID = "ff81ecf1-13ac-44b2-a331-0a207a8c7184";

// ── Evaluation periods ──────────────────────────────────────────────────────
/** Active evaluation period for jury evaluate tests
 *  → exists in demo, owned by E2E_PERIODS_ORG_ID (TED University) */
export const EVAL_PERIOD_ID = "a0d6f60d-ece4-40f8-aca2-955b4abc5d88";

/** Period used by criteria + pin-blocking tests.
 *  TODO: this UUID does not yet exist in vera-demo — these specs will
 *  fail at fixture setup until the demo seed is regenerated to include
 *  a period under E2E_CRITERIA_ORG_ID with this id, or the specs are
 *  refactored to look up an existing period. */
export const E2E_CRITERIA_PERIOD_ID = "cccccccc-0004-4000-c000-000000000004";

/** Period used by outcomes tests. Same caveat as E2E_CRITERIA_PERIOD_ID. */
export const E2E_OUTCOMES_PERIOD_ID = "cccccccc-0005-4000-c000-000000000005";

// ── Jurors ──────────────────────────────────────────────────────────────────
export const EVAL_JURORS = [
  { id: "b3aa250b-3049-4788-9c68-5fa0e8aec86a", name: "E2E Eval Render" },
  { id: "bbbbbbbb-e2e0-4000-b000-000000000001", name: "E2E Eval Blur" },
  { id: "bbbbbbbb-e2e0-4000-b000-000000000002", name: "E2E Eval Submit" },
] as const;

/** Juror used to test PIN lockout in pin-blocking spec */
export const LOCKED_JUROR_ID = "eeeeeeee-0001-4000-e000-000000000001";

// ── Entry tokens ────────────────────────────────────────────────────────────
export const E2E_ENTRY_TOKEN_ORG_ID = "2060c696-71f7-4a57-a7c9-d3bcdc9db763";
