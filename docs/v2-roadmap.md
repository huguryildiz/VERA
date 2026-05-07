# VERA v2 — Technical Roadmap

**Date:** 2026-05-07
**Status:** Draft (pending team alignment)
**Scope:** Architectural simplification + technical debt paydown. No new features.

---

## Why v2?

VERA v1 works — multi-tenant RLS is solid, the audit chain holds, MÜDEK accreditation requirements are met. But the codebase carries **four structural debts** that compound every sprint:

1. **RPC overload** — 98 public RPCs, most of them single-table CRUD wrappers. PostgREST + RLS already does this work securely.
2. **Frontend bloat** — 96K LOC, 32 drawer files, 9 pages over 700 lines. Onboarding and bundle cost are both high.
3. **`fieldMapping.js` layer** — a permanent UI ↔ DB name-translation layer that requires a test update on every schema change.
4. **Sentinel script inflation** — 6 separate `check:*` scripts, each one the scar of a past production incident. A type system + codegen makes most of them unnecessary.

None of these break production today. All of them slow down future velocity: new features take 2–3× longer, new developer onboarding takes 2–3× as long.

v2 goal: **cut the codebase roughly in half without expanding scope**, and replace ad-hoc discipline with structural correctness.

---

## Non-goals

Explicitly out of scope to prevent creep:

- ❌ New features (no new jury or admin workflows)
- ❌ New verticals (TEDU + similar academic clients — no new domains)
- ❌ Mobile app (responsive web is sufficient)
- ❌ Microservice split (single Supabase + single Vercel stays)
- ❌ Postgres escape (vendor lock-in accepted; RLS dependency accepted)
- ❌ Visual redesign (UI/UX conventions preserved; code reorganized, not redesigned)
- ❌ AI/ML features
- ❌ Real-time multi-user editing (current broadcast-only realtime stays)
- ❌ Tailwind migration (evaluated and deferred to v3 — see Decision 2)

---

## Decisions Made

These four decisions were deferred at the planning stage. Resolved here with rationale so the roadmap is self-contained.

### Decision 1 — TypeScript: incremental

**Choice:** Incremental migration (`allowJs: true`, strict mode last).

**Rationale:** Big-bang TS in a 96K LOC codebase with a small team means a frozen branch for 2–3 months — exactly the kind of risky, hard-to-reverse operation we avoid. Incremental lets features ship while migration progresses. The order: shared API layer and types first (highest leverage), hooks second, pages last.

### Decision 2 — CSS: utility-first, not Tailwind

**Choice:** Build a thin in-house utility layer on top of the existing CSS variables system. No Tailwind.

**Rationale:** Tailwind mid-migration creates a hybrid codebase that is harder to reason about than either pure Tailwind or pure custom CSS. The existing design system (`variables.css`, component classes, token naming) is mature and correct — Tailwind would fight it for 3–4 months before producing net improvement. Utility-first custom classes deliver 60% of the benefit at 10% of the migration cost. Tailwind remains a v3 candidate if the team aligns on it from scratch.

### Decision 3 — RPC deletion: 2-week soak then hard-delete

**Choice:** Mark deprecated → 2-week soak in production → hard-delete. Not a month.

**Rationale:** This is an internal tool, not a public API. All callers are the same frontend — we know them. A month is unnecessary caution; 2 weeks catches any edge cases that unit tests miss (e.g., a rarely triggered admin flow, a cron-adjacent call). Add a `/* @deprecated: remove after YYYY-MM-DD */` comment on the RPC and the client call site; grep CI fails if the removal date passes without the deletion.

### Decision 4 — Staffing: 2 developers minimum

**Choice:** Phases 0–4 require at least 2 developers: one owning the DB/RPC layer, one owning the frontend. Solo execution is not recommended.

**Rationale:** Phase 2 (RPC deletion) requires an independent reviewer for every dropped function — the person who wrote the RPC and the person who deletes it should not be the same. Without a second pair of eyes, the risk of silently breaking a rarely-used admin flow is too high to accept. Phases 0, 1, and 4 can be executed by one person; Phases 2 and 3 need two. If only one developer is available, Phase 2 must be gated behind a longer soak period (4 weeks instead of 2) and explicit stakeholder sign-off on each deletion batch.

---

## Target metrics (Definition of Done)

| Metric | v1 (today) | v2 (target) | How to measure |
|---|---|---|---|
| Public RPC count | 98 | ≤ 30 | `grep "CREATE OR REPLACE FUNCTION public.rpc_"` count |
| Frontend LOC (src/) | ~96K | ≤ 55K | `find src -name "*.ts" -o -name "*.tsx" \| xargs wc -l` |
| Largest single file | 1,797 lines | ≤ 500 lines | each file owns one responsibility |
| CSS LOC (src/styles/) | ~13.9K | ≤ 6K | utility-first replacement |
| Edge Function count | 25 | ≤ 12 | template-driven `notify` consolidation |
| `check:*` sentinel scripts | 6 | ≤ 2 | type system + codegen replace the rest |
| Total test count | 230 unit + 145 pgTAP + 75 E2E | ~150 unit + ~80 pgTAP + ~50 E2E | risk-driven pruning |
| Bundle size (gzipped) | TBD baseline | −50% | Vercel analytics |
| TypeScript coverage | 0% (full JSX) | 100% | `tsc --noEmit` clean |
| `fieldMapping.js` | exists | deleted | file absent |

---

## Strategy: incremental, not big-bang

Each phase is **independently shippable** — if one stalls, production is not blocked. New features can be developed in parallel using the strangler-fig pattern: old code stays, new code uses the new pattern, old code migrates when touched.

```
Phase 0 (1–2w) → Phase 1 (3–4w) → Phase 2 (4–6w) → Phase 3 (4–6w) → Phase 4 (2–3w)
  Baseline         TS + Codegen      API surface       Frontend slim     Edge consolidation
                                       (highest risk)
```

Phase 4 has no dependencies on Phases 1–3 and can run in parallel with Phase 0.

---

## Phase 0 — Baseline (1–2 weeks)

**Goal:** Establish measurements and safety nets before any structural change.

### 0.1 Bundle size baseline
- Add `vite-bundle-visualizer` and record Vercel analytics (LCP, TTI, bundle size)
- This is the v2 launch comparison point

### 0.2 Performance baseline
- `e2e/perf/concurrent-jurors.spec.ts` currently `workflow_dispatch` only — wire it to run automatically on release branches
- Record p95 score-write latency; v2 launch must stay within ±10%

### 0.3 RPC usage map
- `scripts/audit-rpc-usage.mjs` — for every `rpc_*`, list: how many frontend call sites, which files, last modified date
- Output: `docs/v2/rpc-usage-map.json`
- RPCs with zero call sites are Phase 2's first deletions

### 0.4 Branch strategy
- No long-lived v2 branch — each phase lands on `main` via PRs
- Each PR diff is narrow (200–400 lines + tests); independently reviewable

**Deliverables:**
- `docs/v2/baseline-metrics.md`
- `scripts/audit-rpc-usage.mjs`

---

## Phase 1 — TypeScript + Codegen (3–4 weeks)

**Goal:** Type safety throughout + autogenerated DB types → kill `fieldMapping.js`, make 4 sentinel scripts redundant.

### 1.1 Incremental TypeScript migration

```
Week 1: tsconfig + vite config; migrate critical shared path
  - src/lib/supabaseClient.ts
  - src/shared/api/* → .ts
  - src/shared/types/db.ts (from codegen, see 1.2)

Weeks 2–3: src/admin/features/*/use*.js → .ts (hooks first — highest RPC surface)
Week 4:    remaining .jsx → .tsx
```

`allowJs: true` throughout; strict mode enabled in the final week only. Acceptance: `tsc --noEmit` clean, no `.js` or `.jsx` files remain.

### 1.2 Supabase codegen pipeline

```bash
supabase gen types typescript --project-id <ref> > src/shared/types/db.ts
```

Added to a pre-commit hook. CI drift check: new migration → types regen → if diff exists, fail.

This makes `Database['public']['Tables']['jurors']['Row']` the single source of truth for field names and types.

### 1.3 Eliminate fieldMapping

- New `.ts` files use DB naming directly (`first_name`, not `firstName`) from day one
- During `.jsx → .tsx` migration: remove mapping calls at each file
- By end of Phase 1: `fieldMapping.js` is empty → delete it and its test

This is the right trade-off per Decision 1. Snake_case in JS is mildly ugly; a permanent translation layer is permanently expensive.

### 1.4 Sentinel reduction

| Sentinel | v2 fate |
|---|---|
| `check:db-types` | Becomes a pre-commit hook — removed from CI |
| `check:no-native-select` | ESLint custom rule (in-repo plugin) — removed from CI |
| `check:no-nested-panels` | stylelint rule — removed from CI |
| `check:rls-tests` | **Kept** — DB drift is critical |
| `check:rpc-tests` | **Kept** — DB drift is critical |
| `check:edge-schema` | **Kept** — Edge Function contracts |
| `check:guideline-coverage` | Simplified as test count drops |

**Deliverables:**
- `tsconfig.json` strict
- `src/shared/types/db.ts` autogen
- `eslint-plugin-vera/` (in-repo custom rules)
- `fieldMapping.js` deleted

**Estimated effort:** 1 senior dev × 4 weeks, or 2 devs × 2 weeks

---

## Phase 2 — API surface reduction (4–6 weeks)

**Goal:** 98 RPCs → ≤ 30. Remaining traffic through PostgREST + RLS + views.

### 2.1 Classification rule

One line: an RPC belongs in **category A** only if at least one of these is true:

1. Touches ≥ 2 tables (transaction guarantee required)
2. Writes an audit log row (`_audit_write` call)
3. Computes derived data (score, ranking, attainment %)
4. Enforces period lock or snapshot immutability
5. Called by a cron job or Edge Function (PostgREST is not available there)

If none of the five applies → delete the RPC.

### 2.2 Three categories

| Category | Action | Estimated count |
|---|---|---|
| **A. Keep** — transactional, audit-relevant, multi-table, computed | RPC stays; contract documented | ~25–30 |
| **B. View** — read-only multi-join | `CREATE VIEW v_*` + RLS policy; frontend uses `from('v_*')` | ~30–35 |
| **C. Direct CRUD** — single-table insert/update/delete | RPC deleted; frontend uses `from(table).insert(...)` | ~30–40 |

### 2.3 Migration steps

```
1. From Phase 0 RPC map: zero-call-site RPCs → delete immediately           (~10–15 RPCs)
2. SELECT-only RPCs → convert to views; 2-week soak → hard-delete           (~30 RPCs)
3. Single-table mutation RPCs → direct CRUD; 2-week soak → hard-delete      (~35 RPCs)
4. Remaining ~25–30: keep, add contract doc comment to function header
```

Deprecation marker pattern:
```sql
-- @deprecated: remove after 2026-07-01 (replaced by view v_admin_jurors_with_stats)
CREATE OR REPLACE FUNCTION public.rpc_admin_list_jurors(...)
```

CI: grep for `@deprecated` dates that have passed → fail build until deletion lands.

### 2.4 RLS coverage expansion

Current sentinel covers SELECT-only for 27/27 tables. Before Phase 2 lands:

- Full CRUD matrix per tenant-scoped table: SELECT / INSERT / UPDATE / DELETE × org A / org B / super-admin = 12 assertions per table (up from 5)
- This is the safety net that makes direct CRUD trustworthy without RPC wrappers

### 2.5 Policy update

Add to `.claude/rules/db-migrations.md`:

> **Before opening a new RPC:** check all five criteria in §2.1. If none applies, use a view or direct CRUD. The PR description must name which criterion justifies the RPC.

**Deliverables:**
- `005_rpcs_jury.sql` ~1,100 → ~400 lines
- `006a_rpcs_admin.sql` + `006b_rpcs_admin.sql` ~3,900 → ~1,500 lines
- `002_views.sql` (new file; view definitions extracted from tables migration)
- `docs/api-style-guide.md` — decision tree for anyone opening new endpoints

**Estimated effort:** 2 devs × 5 weeks
**Risk:** High. Every deleted RPC requires frontend call-site updates + 2-week soak. Phase 1 (type safety) must land first.

---

## Phase 3 — Frontend reduction (4–6 weeks)

**Goal:** 96K LOC → ≤ 55K. No single file over 500 lines.

### 3.1 Drawer consolidation: 32 → ~10

**Problem:** Every entity has three separate files: `AddJurorDrawer`, `EditJurorDrawer`, `ViewJurorDrawer` — high duplication.

**Solution:** One generic `<EntityDrawer>` + per-entity config objects:

```tsx
<EntityDrawer
  entity="jurors"
  mode="add" | "edit" | "view"
  recordId={selectedId}
  onSaved={refresh}
/>
```

`entityConfig['jurors']` declares: fields, validation rules, whether to use RPC or direct CRUD, layout.

**Migration:** Start with one entity (jurors); prove the pattern; migrate one entity per week; delete old triple-file per entity as it migrates.

**Gain:** ~32 drawers × ~600 lines = ~19K lines → ~5K lines.

### 3.2 Page decomposition

9 pages over 700 lines. Pattern for each:

```
PeriodsPage.jsx (855 lines)
  →
src/admin/features/periods/
  ├── PeriodsPage.tsx        (≤ 200 lines — orchestration only)
  ├── PeriodsTable.tsx       (≤ 200 lines — list rendering)
  ├── PeriodsFilters.tsx     (≤ 150 lines — filter controls)
  ├── PeriodsToolbar.tsx     (≤ 100 lines — action buttons)
  └── usePeriodsView.ts      (≤ 200 lines — data + state)
```

Rule: no component file over 300 lines, no hook file over 400 lines.

### 3.3 CSS reduction (utility-first, per Decision 2)

**Today:** 13.9K lines across 50+ files; the "600-line ceiling" rule in CLAUDE.md is itself evidence of past violations.

**Approach:**
- `src/styles/utilities/` — atomic utility classes (spacing, color, flex helpers)
- Component CSS files keep only layout-specific rules; everything expressible as a utility class is removed
- Target: average component CSS file 600 → 200 lines
- `src/styles/variables.css` token system stays — it is the design system foundation

### 3.4 Test count reduction

230 unit tests contain smoke/render tests that proved nothing (per `docs/qa/vera-test-audit-report.md`). The risk-driven test rules in `.claude/rules/test-writing.md` have been written; Phase 3 enforces them retroactively:

- "Page renders" with no behavior assertion → deleted
- E2E "drawer opens + Save click" with no DB assertion → extended or deleted
- `it.todo()` older than one sprint → deleted (not implemented)
- Target: 230 → ~150 unit, 75 → ~50 E2E — but every remaining test proves a real risk

**Deliverables:**
- `<EntityDrawer>` + 10 entity configs
- 9 pages decomposed (3–5 files each)
- `src/styles/utilities/` set
- Test pruning audit report

**Estimated effort:** 2 devs × 5 weeks

---

## Phase 4 — Edge Function consolidation (2–3 weeks)

**Goal:** 25 → ≤ 12 Edge Functions. Merge 9 email-notification functions into one template-driven handler.

### 4.1 `notify` consolidation

**Today:** 9 separate email functions — each with its own auth check, Resend call, audit write, error handling.

**Target:** One `notify` Edge Function:

```ts
POST /notify
{
  template: "juror-pin" | "maintenance" | "unlock-request" | ...,
  recipient: { email, name, lang },
  data: { ... }   // template-specific payload
}
```

Templates live in `supabase/functions/_shared/templates/`. Auth, retry logic, and audit write are implemented once.

**Line count:** 9 functions × ~280 lines = ~2,500 → 1 function ~400 lines + 9 templates ~80 lines each = ~1,100 lines.

### 4.2 Functions to leave untouched

Auth-path functions stay as-is — the Kong JWT bypass + custom auth pattern is fragile and the risk of consolidating it is not worth the LOC saving:

- `admin-session-touch`, `email-verification-confirm`, `invite-org-admin`
- `request-pin-reset`, `request-score-edit`, `on-auth-event`, `password-reset-email`

Cron/sweep functions stay:
- `audit-anomaly-sweep`, `auto-backup`, `audit-log-sink`, `platform-metrics`

### 4.3 Dual-deploy discipline

Add `scripts/deploy-edge-fn.mjs` — single command deploys to both `vera-prod` and `vera-demo`:

```bash
node scripts/deploy-edge-fn.mjs notify
# → mcp deploy vera-prod/notify + mcp deploy vera-demo/notify in sequence
```

Every Edge Function PR must reference this script in the deploy checklist. The existing nightly `edge-fn-smoke.yml` is extended to cover `notify`.

**Deliverables:**
- `supabase/functions/notify/` (template-driven)
- 9 old email functions deleted
- `scripts/deploy-edge-fn.mjs`

**Estimated effort:** 1 dev × 3 weeks

---

## Phase summary

| Phase | Duration | Risk | Primary gain | Dependency |
|---|---|---|---|---|
| **0. Baseline** | 1–2 weeks | Low | Measurements + safety nets | None |
| **1. TS + Codegen** | 3–4 weeks | Medium | `fieldMapping` gone; 4 sentinels eliminated | Phase 0 |
| **2. API reduction** | 4–6 weeks | **High** | RPC 98 → 30; SQL ~5K → ~2K lines | Phase 1 |
| **3. Frontend slim** | 4–6 weeks | Medium | LOC 96K → 55K; CSS 14K → 6K | Phase 1 |
| **4. Edge consolidation** | 2–3 weeks | Low | 25 → 12 functions | None (can run with Phase 0) |

**Total:** 14–21 weeks (3.5–5 months), minimum 2 developers.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Deleted RPC breaks a rarely-triggered prod flow | Medium | High | 2-week soak; deprecated marker in CI; Phase 1 type safety first |
| TS migration introduces a runtime type mismatch | Low | Medium | `allowJs: true` incremental; strict mode last week of Phase 1 |
| Frontend refactor causes E2E flake | High | Low | E2E baseline locked before Phase 3; regression blocks merge |
| New feature request arrives mid-v2 | High | Medium | Strangler-fig: parallel feature work is always possible |
| Solo execution (only 1 developer available) | Medium | High | Per Decision 4: Phase 2 soak extended to 4 weeks; batch sign-off required |

---

## What comes after v2

Not in scope, but worth noting — a clean v2 enables these:

- **Public API** — 25–30 well-documented RPCs are a reasonable API surface for external integrations
- **Tailwind** — start a greenfield UI component library on Tailwind; migrate gradually in v3
- **Multi-language UI** — Turkish + English + ? (i18n infrastructure is much cheaper on 55K LOC)
- **White-label** — per-university theming on top of a clean CSS token system
- **Self-serve org onboarding** — no admin intervention to create a new tenant

---

## Launch checklist

v2 is ready to ship when all of the following are green:

- [ ] All target metrics in the table above are met
- [ ] No existing E2E spec regressed
- [ ] Bundle size reduced ≥ 40% vs baseline
- [ ] p95 score-write latency within ±10% of baseline
- [ ] `tsc --noEmit` clean
- [ ] `fieldMapping.js` deleted
- [ ] RPC count ≤ 30
- [ ] Largest single file ≤ 500 lines
- [ ] CSS LOC ≤ 6K
- [ ] Edge Function count ≤ 12
- [ ] Full E2E smoke test passes against TEDU production data simulation

---

*This document is a draft. Each phase becomes a formal implementation plan under `.claude/internal/plans/YYYY-MM-DD-<slug>/` when work begins. Update the `Status:` line at the top when team alignment is confirmed.*
