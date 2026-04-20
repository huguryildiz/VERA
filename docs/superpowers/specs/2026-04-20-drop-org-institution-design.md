# Drop `organizations.institution` — single-name tenant identity

**Date:** 2026-04-20
**Status:** Draft (awaiting review)
**Author:** brainstormed with hugur

## Context

VERA's tenant model currently stores org identity across **two columns**:

- `organizations.institution` — free-text parent group (e.g., `TED University`).
- `organizations.name` — the actual tenant display name (e.g., `Electrical-Electronics Engineering`).

The admin `OrganizationsPage` exposes these as two separate columns labelled "Organization" and "Program". The registration screen, however, never collects `institution` — it only asks for a single `orgName` which is written to `name`, leaving `institution` NULL for every self-served tenant.

This asymmetry causes three problems:

1. **Registration inconsistency** — orgs created via signup have `institution = NULL` and render as `—` in the admin table (see the TESTORG row).
2. **Confusing mental model** — VERA serves both universities (natural "Institution → Program" hierarchy) and competitions (no parent grouping), but the schema pretends every tenant has a parent and the UI shows a two-level structure even when the lower level has nothing meaningful in it.
3. **Useless complexity** — `institution` drives grouping in the "Join Existing" combobox, but since self-served orgs never populate it, most rows fall into the "Other" bucket. The split adds code paths (`splitInstitution`, `GroupedCombobox`, `p_institution` RPC params, avatar initials from institution) without real product value.

The user's framing: *"bir tane zorunlu alan olsa hepsi çözülecek — TEDU EE, TEDU CE, TEKNOFEST"*. A single human-readable `name` per tenant is enough. Compound names like `TED University — Electrical-Electronics Engineering` naturally encode the institution when one exists, and competition brands (`TEKNOFEST`, `TÜBİTAK 2204-A`) stand on their own.

Prod DB has zero real tenants yet; demo DB is entirely regenerated via `scripts/generate_demo_seed.js`. No data-preservation migration is needed — we just drop the column and update the seed.

## Design

### 1. Schema change

Update `sql/migrations/002_tables.sql` to remove `institution` from the `CREATE TABLE organizations` statement. Since this is a snapshot-style migration (edit in place, no forward-only patch), the column simply disappears from the source of truth.

```sql
CREATE TABLE organizations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT UNIQUE NOT NULL,
  name               TEXT NOT NULL,
  contact_email      TEXT,
  status             TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'archived')),
  settings           JSONB NOT NULL DEFAULT '{}',
  setup_completed_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);
-- existing unique index on lower(name) stays
```

The `handle_auth_user_confirmation` trigger (same file) currently reads `raw_user_meta_data ->> 'institution'` and inserts it. Both the read and the insert are removed; the `v_institution` local and its parameter plumbing go with it.

### 2. RPC signatures

- `rpc_admin_create_org_and_membership` ([006_rpcs_admin.sql:554](sql/migrations/006_rpcs_admin.sql#L554)): drop `p_institution` and `p_department` parameters. Regenerate `GRANT EXECUTE` with the new signature `(TEXT, TEXT)`.
- Any admin list RPC that selects `institution` (`rpc_admin_list_organizations`, `rpc_list_organizations_public`, etc.) removes the column from its `SELECT`/`jsonb_build_object`.

### 3. Seed — final names

Update `scripts/generate_demo_seed.js:198-202` so each org has one `name` field (no `institution`). Final values:

| `name` | `code` | `type` |
|---|---|---|
| `AAS CanSat Competition` | `CANSAT` | competition |
| `Carnegie Mellon University — Computer Science` | `CMU-CS` | academic |
| `IEEE APS — AP-S Student Design Contest` | `IEEE-APSSDC` | competition |
| `TED University — Electrical-Electronics Engineering` | `TEDU-EE` | academic |
| `TEKNOFEST` | `TEKNOFEST` | competition |
| `TÜBİTAK 2204-A` | `TUBITAK-2204A` | competition |

The INSERT statement at `scripts/generate_demo_seed.js:235` loses its `institution` column and corresponding `escapeSql(o.institution)` value.

Any audit-log seed strings that reference `institution` in JSON details (e.g., `orgName` strings at line 2344-2345) are already using the final `name` — no change needed.

### 4. API layer

- `src/shared/api/admin/tenants.js` (`listOrganizationsPublic`, `rpc_admin_list_organizations` wrapper): stop selecting/returning `institution`.
- `src/shared/api/adminApi.js` and `src/shared/api/admin/auth.js` (register flow): remove `institution` and `department` from the `payload` passed to `rpc_admin_create_org_and_membership`.
- `fieldMapping.js`: no change (institution never had a UI↔DB alias).

### 5. Frontend

**`src/auth/screens/RegisterScreen.jsx`**
- The screen already renders a single "Organization Name" input; no UI change.
- Remove `institution: ""` and `department: ""` from both `doCompleteProfile(...)` and `doRegister(..., payload)` call sites (lines 251, 257-263).
- Placeholder copy already says "e.g., TED University — Electrical Engineering" — keep as a compound-name hint.
- Replace `GroupedCombobox` with a plain `Combobox` in the "Join Existing" branch; drop the `group: o.institution || "Other"` mapping (`orgOptions` becomes `[{ value, label }]` only).

**`src/admin/pages/OrganizationsPage.jsx`**
- Delete `splitInstitution` helper (line 118) and its callsites.
- Delete the `institution` sort key branch (line 391) from `handleOrgSort`; `name` becomes the only sortable identifier column.
- Collapse the "Organization | Program" two-column header into a single "Organization" column. The `<th>` sortable handler uses sort key `name`.
- The `<td>` renders `org.name` as the primary value. No subtitle/code row — that was option C, not the chosen option B.
- Avatar initials: `getOrgInitials(org.institution)` → `getOrgInitials(org.name)`. Same for `getOrgHue(...)`. Verify the initials function handles multi-word names (first letters of first two tokens).
- Edit drawer: remove the `institution` input. Keep only `name`, `code` (read-only), `contact_email`, `status`.
- View drawer: remove the `viewOrgMeta?.university || viewOrg?.name` fallback (line 847) and the "Program" detail row (line 876). Single "Name" row plus code.
- Any derived text like `viewOrg?.institution` in tooltips, breadcrumbs, or `admin-mobile` card subtitles: removed.

**Other pages that might read `institution`:**
- Grep for `\.institution\b` across `src/` to catch stray usages (settings page, overview KPI strip, audit log details formatter). Each must either drop the reference or substitute `name`.

### 6. Error mapping

`normalizeError` in `RegisterScreen.jsx` has no `institution_required` case — nothing to remove there. Check `src/shared/api/admin/auth.js` normalizer for equivalent — likely none. No user-facing error string needs editing.

### 7. Tests

- `src/auth/__tests__/RegisterScreen.test.jsx` and any test asserting `institution` in the register payload: update expectations.
- `src/admin/__tests__/OrganizationsPage.test.jsx` (if present): update column assertions to expect single "Organization" column.
- Contract tests for `listOrganizationsPublic` and `rpc_admin_create_org_and_membership`: update shape.
- E2E `auth.spec.ts` register flow: already enters one orgName field; no change needed unless assertion checks post-signup admin table column count.

### 8. Docs

- Update `sql/README.md` to reflect the `organizations` column list.
- No CLAUDE.md change required (institution was never called out there).

## Out of scope

- **Programme outcomes** (MÜDEK/ABET terminology used in analytics/landing copy): accreditation concept, unrelated to tenant identity. Not touched.
- **`jurors.affiliation`, `projects.advisor`, team members, etc.**: separate naming thread.
- **Tenant type (university vs competition)**: considered but rejected. A single `name` column handles both use cases cleanly; adding `type` would reintroduce the complexity we're removing.
- **Parent/child institution grouping**: rejected. Admins who want the TEDU grouping can use the compound name. Grouping across tenants is not a current product need.
- **Setup wizard**: did not use `institution`; unchanged.

## Applying the change to live DBs

Both live Supabase projects (vera-prod and vera-demo) already have `organizations.institution` as an existing column — editing `002_tables.sql` in place changes the source of truth, but the running databases still hold the column. Prod has no tenant data; demo is regenerated from seed. The rollout is therefore:

1. **Edit `sql/migrations/002_tables.sql` in place** — remove `institution` from `CREATE TABLE organizations` and from the `handle_auth_user_confirmation` trigger.
2. **Demo** — run `000_dev_teardown` → `001..009` via Supabase MCP `apply_migration`; then regenerate and load the seed.
3. **Prod** — apply a one-shot DDL via Supabase MCP `apply_migration` (name it `drop_org_institution`) containing: `ALTER TABLE organizations DROP COLUMN IF EXISTS institution;` plus any RPC signature drops needed so the old signature doesn't linger (`DROP FUNCTION IF EXISTS public.rpc_admin_create_org_and_membership(TEXT, TEXT, TEXT, TEXT);`). Then re-apply the updated `006_rpcs_admin.sql` RPC definitions.
4. The one-shot DDL is **not** checked into `sql/migrations/` as a permanent file — it is an environment sync step. The permanent source of truth stays the edited `002` snapshot. (This is consistent with the snapshot policy: prod diverges from snapshot only transiently during rollout.)

## Verification

1. `node scripts/generate_demo_seed.js` runs without errors; resulting SQL has no `institution` token.
2. After applying rollout steps above, both envs: `\d organizations` shows no `institution` column.
3. `listOrganizationsPublic` shape verified in browser devtools — no `institution` key.
4. Self-serve register flow: new user signs up with `orgName = "TED University — Electrical Engineering"`, confirms email, lands in admin. Admin `OrganizationsPage` row renders the full name in the single "Organization" column.
5. Demo admin `OrganizationsPage` shows all 6 seeded rows with their new names; sort, filter, avatar initials all behave.
6. `npm run build && npm test -- --run` passes.

## Risks

- **Grep miss.** Scattered references to `.institution` in code/tests/audit JSON might slip through. Mitigation: mechanical `grep -rn "institution" src/ supabase/ sql/` pre-merge to confirm zero residue outside dropped sections.
- **Audit history.** Prod has no data, demo regenerates; no existing audit rows reference the column at query time. If a stray historical `details` JSON contains an `"institution": "..."` key it's just a string value — no DDL dependency.
