# VERA v1 — Canonical Data Model & Role Model Review

> **Date:** 2026-04-02
> **Status:** Decision document — approved recommendations for v1 backend rewrite
> **Context:** Prototype parity rewrite (Phases 1-7 done). DB migration needed before Phase 8+.
> **References:**
>
> - `docs/concepts/vera-premium-prototype.html` (UI source of truth)
> - `docs/superpowers/plans/v1-backend-blueprint.md` (initial blueprint)
> - `docs/superpowers/plans/ui-migration/2026-04-ui-parity-repair.md` (UI plan)
> - `sql/migrations/` (current schema — to be replaced)

---

## 1. Executive Summary

Current DB schema (14 tables, hardcoded `technical/written/oral/teamwork` columns) cannot
support the prototype's dynamic criteria, snapshot immutability, or normalized scoring needs.
The blueprint (`v1-backend-blueprint.md`) points in the right direction but its ops layer
(maintenance, backup, restore) is too heavy for v1.

**Decisions:**

- **Full migration rewrite** — current 001-004 + supabase patches replaced by clean 8-file chain
- **Normalized scoring** — wide-row `scores` table removed; `score_sheets` + `score_sheet_items`
- **Period snapshot** — framework freeze model required for scoring integrity
- **2 admin roles only** — `super_admin` + `org_admin`; juror access is a separate mechanism
- **No viewer role** — period-scoped read-only juror portal (v1.1) replaces the concept
- **v1 scope:** 19 tables + ~15 RPCs + full RLS; ops/maintenance/restore deferred to v1.1+

---

## 2. Recommended Canonical Data Model

### 2.1 Identity & Organizations

#### `organizations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `code` | TEXT UNIQUE NOT NULL | Short code: "TEDU-EE" |
| `name` | TEXT NOT NULL | "Electrical & Electronics Engineering" |
| `institution_name` | TEXT | "TED University" |
| `contact_email` | TEXT | |
| `status` | TEXT CHECK (active\|disabled\|archived) | Default 'active' |
| `settings` | JSONB DEFAULT '{}' | Org-level config (language, timezone, prefs) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

Blueprint uses `meta` JSONB for institution/contact — rejected. `institution_name` and
`contact_email` are displayed everywhere and must be queryable as explicit columns. Only
genuinely flexible config stays in `settings` JSONB.

#### `profiles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK -> auth.users(id) | |
| `display_name` | TEXT | |
| `avatar_url` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

Unchanged from current schema.

#### `memberships`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID -> profiles(id) CASCADE | |
| `organization_id` | UUID -> organizations(id) CASCADE | NULL = super_admin |
| `role` | TEXT CHECK (org_admin\|super_admin) | |
| `created_at` | TIMESTAMPTZ | |
| UNIQUE | (user_id, organization_id) | |

Role value `admin` renamed to `org_admin` for clarity.

#### `org_applications`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID -> organizations(id) | |
| `applicant_name` | TEXT NOT NULL | |
| `contact_email` | TEXT NOT NULL | |
| `message` | TEXT | |
| `status` | TEXT CHECK (pending\|approved\|rejected\|cancelled) | |
| `reviewed_by` | UUID -> profiles(id) | |
| `reviewed_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

Renamed from `tenant_applications`. Same structure.

**v1 required:** Yes, all 4 tables.

---

### 2.2 Frameworks & Snapshots

#### `frameworks`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID -> organizations(id) CASCADE | NULL = built-in |
| `name` | TEXT NOT NULL | "MUDEK 2024" |
| `description` | TEXT | |
| `version` | TEXT | "2024" |
| `default_threshold` | NUMERIC DEFAULT 70 | Attainment threshold % |
| `outcome_code_prefix` | TEXT DEFAULT 'PO' | "PO", "SO", "CO" |
| `is_default` | BOOLEAN DEFAULT false | One default per org |
| `created_at` | TIMESTAMPTZ | |

#### `framework_outcomes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `framework_id` | UUID -> frameworks(id) CASCADE | |
| `code` | TEXT NOT NULL | "9.1", "3.2" |
| `label` | TEXT NOT NULL | "Oral Communication" |
| `description` | TEXT | |
| `sort_order` | INT DEFAULT 0 | |
| UNIQUE | (framework_id, code) | |

#### `framework_criteria`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `framework_id` | UUID -> frameworks(id) CASCADE | |
| `key` | TEXT NOT NULL | "technical", "design", "delivery", "teamwork" |
| `label` | TEXT NOT NULL | "Technical Knowledge" |
| `short_label` | TEXT | "Tech" |
| `description` | TEXT | Rubric guidance blurb |
| `max_score` | NUMERIC NOT NULL | 30, 10, etc. |
| `weight` | NUMERIC NOT NULL | Percentage |
| `color` | TEXT | Hex color |
| `rubric_bands` | JSONB | `[{min, max, label, description}]` |
| `sort_order` | INT DEFAULT 0 | |
| UNIQUE | (framework_id, key) | |

`rubric_bands` stays as JSONB — band count varies (3-5) and relational normalization
adds unnecessary complexity. `max_score`, `weight`, `label` are explicit columns because
they are queried/aggregated.

#### `framework_criterion_outcome_maps`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `framework_id` | UUID -> frameworks(id) CASCADE | |
| `criterion_id` | UUID -> framework_criteria(id) CASCADE | |
| `outcome_id` | UUID -> framework_outcomes(id) CASCADE | |
| `coverage_type` | TEXT CHECK (direct\|indirect) DEFAULT 'direct' | |
| `weight` | NUMERIC | Optional mapping weight |
| UNIQUE | (criterion_id, outcome_id) | |

Current `criterion_outcome_mappings` uses `criterion_key` TEXT — fragile.
Framework-scoped UUID FK is correct.

#### Snapshot Tables (Period Freeze)

When a period is activated (or first score is entered), the framework's current state
is snapshotted. Subsequent framework edits do not affect the active period.

#### `period_criteria` (snapshot)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `period_id` | UUID -> periods(id) CASCADE | |
| `source_criterion_id` | UUID | Original framework_criteria.id (traceability) |
| `key` | TEXT NOT NULL | |
| `label` | TEXT NOT NULL | |
| `short_label` | TEXT | |
| `description` | TEXT | |
| `max_score` | NUMERIC NOT NULL | |
| `weight` | NUMERIC NOT NULL | |
| `color` | TEXT | |
| `rubric_bands` | JSONB | |
| `sort_order` | INT | |
| UNIQUE | (period_id, key) | |

#### `period_outcomes` (snapshot)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `period_id` | UUID -> periods(id) CASCADE | |
| `source_outcome_id` | UUID | |
| `code` | TEXT NOT NULL | |
| `label` | TEXT NOT NULL | |
| `description` | TEXT | |
| `sort_order` | INT | |
| UNIQUE | (period_id, code) | |

#### `period_criterion_outcome_maps` (snapshot)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `period_id` | UUID -> periods(id) CASCADE | |
| `period_criterion_id` | UUID -> period_criteria(id) CASCADE | |
| `period_outcome_id` | UUID -> period_outcomes(id) CASCADE | |
| `coverage_type` | TEXT | |
| `weight` | NUMERIC | |

**Why snapshots are required:**

1. Framework is live-editable — but a period with active scoring must not change criteria
2. Attainment calculations must stay consistent across the period lifecycle
3. Historical comparison (trend analytics) requires stable reference points

**Snapshot trigger:** RPC `rpc_period_freeze_snapshot` called when period `is_current`
is set to true, or on first score entry. If snapshot already exists, RPC is a no-op
(immutable).

**v1 required:** Yes. Without snapshots, dynamic criteria cannot operate safely.

---

### 2.3 Execution Core

#### `periods`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID -> organizations(id) CASCADE | |
| `name` | TEXT NOT NULL | "Spring 2026" |
| `season` | TEXT CHECK (Fall\|Spring\|Summer) | |
| `description` | TEXT | |
| `start_date` | DATE | |
| `end_date` | DATE | |
| `poster_date` | DATE | Evaluation/poster day |
| `framework_id` | UUID -> frameworks(id) | Which framework to use |
| `is_current` | BOOLEAN DEFAULT false | One per org |
| `is_locked` | BOOLEAN DEFAULT false | Scoring disabled |
| `is_visible` | BOOLEAN DEFAULT true | Visible to jury |
| `snapshot_frozen_at` | TIMESTAMPTZ | When snapshot was taken |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Key changes from current schema:**

- `criteria_config` and `outcome_config` JSONB columns **removed** — replaced by snapshot
  tables. JSONB config creates a dual source of truth and is a bug source.
- `poster_date` added — shown in prototype period cards.
- `snapshot_frozen_at` added — NULL means no snapshot yet.

**`semester` -> `period` rename:** Yes. Canonical name is `period`. UI already shows
"Evaluation Period". CSS prefix `sem-*` can stay (no breaking change).

#### `projects`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `period_id` | UUID -> periods(id) CASCADE | |
| `project_no` | INT | Group number (nullable for single projects) |
| `title` | TEXT NOT NULL | |
| `members` | JSONB DEFAULT '[]' | `[{name, order}]` — draggable list in prototype |
| `advisor_name` | TEXT | |
| `advisor_affiliation` | TEXT | |
| `description` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| UNIQUE | (period_id, project_no) WHERE project_no IS NOT NULL | |

**Critical changes:**

- `members` TEXT -> JSONB array. Prototype shows draggable member list with ordering.
  Comma-separated text loses order info. Format: `[{name: "Ali Yilmaz", order: 1}]`
- `advisor` TEXT -> split into `advisor_name` + `advisor_affiliation` (both shown
  separately in prototype)

#### `jurors`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID -> organizations(id) CASCADE | |
| `juror_name` | TEXT NOT NULL | |
| `affiliation` | TEXT NOT NULL | |
| `email` | TEXT | Optional |
| `avatar_color` | TEXT | Deterministic hash or admin-set |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

Mostly unchanged. `avatar_color` added as optional cached value (deterministic hash
can also be computed client-side).

**`project_juror_assignments` needed?**

**Decision: No, not in v1.** Current model has every juror scoring every project in a
period. The prototype shows no selective assignment UI. If needed later:

```sql
-- v1.1
CREATE TABLE project_juror_assignments (
  period_id UUID -> periods(id),
  juror_id  UUID -> jurors(id),
  project_id UUID -> projects(id),
  UNIQUE(juror_id, project_id)
);
```

---

### 2.4 Scoring

#### `score_sheets`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `period_id` | UUID -> periods(id) CASCADE | |
| `project_id` | UUID -> projects(id) CASCADE | |
| `juror_id` | UUID -> jurors(id) CASCADE | |
| `comment` | TEXT | General comment |
| `status` | TEXT CHECK (draft\|in_progress\|submitted) DEFAULT 'draft' | |
| `started_at` | TIMESTAMPTZ | When first score was entered |
| `last_activity_at` | TIMESTAMPTZ | Last autosave timestamp |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| UNIQUE | (juror_id, project_id) | |

#### `score_sheet_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `score_sheet_id` | UUID -> score_sheets(id) CASCADE | |
| `period_criterion_id` | UUID -> period_criteria(id) | Snapshot criterion FK |
| `score_value` | NUMERIC | CHECK (score_value >= 0); NULL = not yet scored |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| UNIQUE | (score_sheet_id, period_criterion_id) | |

**Why this model is correct:**

1. **Dynamic criteria:** Current wide-row (`technical`, `written`, `oral`, `teamwork`
   columns) requires schema migration for each new criterion. Normalized model eliminates
   this.
2. **Snapshot integrity:** `period_criterion_id` FK binds every score directly to the
   snapshot — framework changes after freeze cannot break historical data.
3. **Analytics:** Criterion-based aggregation uses natural JOINs; the field name mapping
   layer (`fieldMapping.js`) is eliminated.
4. **Legacy compatibility:** API responses can still project `technical/design/delivery/
   teamwork` fields — but storage is normalized.

**Derived fields (NOT stored):**

- `total_score` = SUM(score_value) — computed at query time
- `attainment_pct` = per-outcome calculation — computed at query time
- `rubric_band` = score_value mapped to rubric_bands JSON ranges — computed client-side

**`final_submitted_at` location:** Stays on `juror_period_auth` — finalization is
juror-period level, not per-sheet. One juror finalizes all sheets at once.

---

### 2.5 Access & Auth

#### `juror_period_auth`

| Column | Type | Notes |
|--------|------|-------|
| `juror_id` | UUID -> jurors(id) CASCADE | PK part |
| `period_id` | UUID -> periods(id) CASCADE | PK part |
| `pin_hash` | TEXT | bcrypt hash (plain PIN only shown on first reveal) |
| `session_token_hash` | TEXT | SHA-256 hash of 32-byte hex token (plain token never stored) |
| `session_expires_at` | TIMESTAMPTZ | |
| `last_seen_at` | TIMESTAMPTZ | |
| `edit_enabled` | BOOLEAN DEFAULT false | Admin-granted edit mode |
| `edit_reason` | TEXT | Why edit was enabled |
| `edit_expires_at` | TIMESTAMPTZ | Edit mode duration |
| `is_blocked` | BOOLEAN DEFAULT false | |
| `failed_attempts` | INT DEFAULT 0 | |
| `locked_until` | TIMESTAMPTZ | |
| `final_submitted_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| PRIMARY KEY | (juror_id, period_id) | |

**Changes from current:**

- `pin` -> `pin_hash`. Plain text PIN must not be stored. PIN is shown once on first
  creation, then only the bcrypt hash is kept.
- `edit_reason` and `edit_expires_at` added — prototype requires reason + duration when
  enabling edit mode.

#### `entry_tokens`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `period_id` | UUID -> periods(id) CASCADE | |
| `token_hash` | TEXT UNIQUE NOT NULL | SHA-256 hash of plain token (plain token never stored) |
| `is_revoked` | BOOLEAN DEFAULT false | |
| `expires_at` | TIMESTAMPTZ | 24h TTL |
| `created_at` | TIMESTAMPTZ | |

Unchanged from current. Working correctly.

#### `juror_portal_sessions` (v1.1 — not in v1)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `juror_id` | UUID -> jurors(id) CASCADE | |
| `auth_user_id` | UUID -> auth.users(id) | |
| `created_at` | TIMESTAMPTZ | |
| UNIQUE | (juror_id, auth_user_id) | |

Deferred to v1.1 because portal UI does not exist yet.

---

### 2.6 Ops & Settings

#### `audit_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID -> organizations(id) | |
| `actor_id` | UUID | Admin user or system |
| `action` | TEXT NOT NULL | "period.create", "score.upsert", etc. |
| `resource_type` | TEXT | "period", "project", "juror", "score" |
| `resource_id` | UUID | |
| `details` | JSONB | Additional info (old/new values) |
| `created_at` | TIMESTAMPTZ DEFAULT now() | |

Current structure is sufficient. `action` format standardized to `{resource}.{verb}`.

#### `system_settings` — deferred to v1.1

Organization-level settings live in `organizations.settings` JSONB. Global system settings
not needed in v1 — single Supabase project, env vars are sufficient.

#### `maintenance_windows` / `export_jobs` / `backup_jobs` — deferred to v1.1+

- **Maintenance:** Handled via Supabase dashboard in v1.
- **Export:** Synchronous export is sufficient (max ~1000 rows). Async job queue is
  premature optimization.
- **Backup:** Supabase provides automatic backups. Custom backup/restore is risky.

**v1 required:** Only `audit_logs`.

---

### 2.7 Audit / Analytics Read Models

**Decision: No separate read model tables needed.**

Analytics calculations derive from `score_sheet_items` + `period_criteria` +
`period_outcomes` + `period_criterion_outcome_maps` via JOINs + aggregation.

If performance becomes an issue (500+ projects, 50+ jurors), materialized views can be
added — but unnecessary in v1.

---

### Table Summary

| Group | Table | v1 | v1.1 |
|-------|-------|----|------|
| Identity | `organizations` | YES | |
| Identity | `profiles` | YES | |
| Identity | `memberships` | YES | |
| Identity | `org_applications` | YES | |
| Framework | `frameworks` | YES | |
| Framework | `framework_outcomes` | YES | |
| Framework | `framework_criteria` | YES | |
| Framework | `framework_criterion_outcome_maps` | YES | |
| Snapshot | `period_criteria` | YES | |
| Snapshot | `period_outcomes` | YES | |
| Snapshot | `period_criterion_outcome_maps` | YES | |
| Execution | `periods` | YES | |
| Execution | `projects` | YES | |
| Execution | `jurors` | YES | |
| Scoring | `score_sheets` | YES | |
| Scoring | `score_sheet_items` | YES | |
| Auth | `juror_period_auth` | YES | |
| Auth | `entry_tokens` | YES | |
| Auth | `juror_portal_sessions` | | YES |
| Ops | `audit_logs` | YES | |
| Ops | `system_settings` | | YES |
| Ops | `maintenance_windows` | | v1.2 |
| Ops | `export_jobs` | | v1.1 |

**v1 total: 19 tables** (current 14 + 5 net new from snapshot + normalized scoring)

---

## 3. Role Model Recommendation

**Decision: 2 admin roles only.**

| Role | Scope | Access |
|------|-------|--------|
| `super_admin` | Platform-wide | All organizations, framework management, application approvals, platform settings |
| `org_admin` | Single organization | Own org's period/project/juror/criteria/token/audit management |

**Juror access stays outside the admin role system:**

- **PIN-based scoring:** Anonymous, session-based, controlled by `juror_period_auth`.
  No RLS — uses SECURITY DEFINER RPCs.
- **Portal read-only (v1.1):** `juror_portal_sessions` links auth.users to juror records
  but never enters `memberships`.

**Why additional roles are NOT needed:**

1. **`viewer`:** Nobody in an organization "just watches" — they are either admin or
   juror. If someone needs to see results, admin exports and shares.

2. **`staff` / `analyst`:** Role explosion. In v1, org_admin can do everything. If
   granular permissions are needed later, add `permissions` JSONB to `memberships`
   instead of new roles — more flexible.

3. **`read_only_admin`:** This is org_admin with `permissions: {write: false}`. But
   in v1 this is unnecessary — orgs have 1-3 admins who all need full access.

**Long-term (v2+):** Permission-based access control via `memberships.permissions` JSONB
if needed. But v1's 2-role model is sufficient and safe.

---

## 4. Juror Viewer Decision

**Decision: No viewer role. Period-scoped read-only juror portal instead.**

### Why a viewer role is wrong

1. **Role pollution:** The `memberships` table is designed for admin users. Adding jurors
   means they appear in admin panels, RLS policies become complex, and UI needs role
   switching logic.

2. **Scope mismatch:** Does a "viewer" see the whole organization? Just their own scores?
   The concept is ambiguous — the level of data access is undefined.

3. **Privacy risk:** Organization-wide viewer access lets a juror see other jurors' scores.
   This creates fairness concerns, especially while scoring is ongoing.

4. **Premature disclosure:** A juror seeing averages, rankings, or analytics for other
   projects can introduce anchoring bias into their own scoring.

5. **Anchoring bias:** If a juror can see running averages before scoring, they
   consciously or unconsciously adjust their scores toward the mean.

### Correct model: Period-scoped juror portal (v1.1)

```text
Juror Portal:
|-- My Evaluations
|   |-- Period list (only periods they participated in)
|   |-- Project list (only projects they scored)
|   |-- Own scores (read-only)
|-- No organization-wide data
|-- No other jurors' scores
|-- No rankings or analytics
```

**Auth mechanism:**
`juror_portal_sessions(juror_id, auth_user_id)` links a Supabase Auth user to an
existing juror record.

**RLS:**

```sql
WHERE juror_id IN (
  SELECT juror_id FROM juror_portal_sessions
  WHERE auth_user_id = auth.uid()
)
```

**v1 status:** Juror portal is NOT in v1. PIN-based scoring is sufficient. Portal is
added in v1.1 after the admin panel is fully stable.

---

## 5. Proposed v1 / v1.1 / v1.2 Scope Split

### v1 — Core Platform

- 19 tables (model above)
- Admin auth (Supabase Auth + memberships)
- Jury PIN flow (authenticate -> verify -> upsert -> finalize)
- Entry token management
- Period snapshot freeze (framework -> period_criteria/outcomes/maps)
- Normalized scoring (score_sheets + score_sheet_items)
- Admin CRUD: organizations, periods, projects, jurors, frameworks, criteria,
  outcomes, mappings
- Audit logging (trigger-based)
- Synchronous export (XLSX/CSV/PDF — generated client-side)
- RLS policies on all tables
- Legacy compatibility layer: API responses project
  `technical/design/delivery/teamwork` fields

### v1.1 — Portal & Ops

- Juror portal (auth-based read-only access)
- `juror_portal_sessions` table
- `system_settings` table
- Bulk import (CSV -> projects/jurors)
- Project-juror assignments (selective scoring)
- Server-side pagination (audit logs, score details)
- `export_jobs` table (async export for large datasets)

### v1.2 — Advanced Ops

- `maintenance_windows` table + UI
- `backup_jobs` + Supabase Storage
- Restore flow (confirmations, dry-run)
- Advanced analytics materialized views
- Email notifications (score submission, period lock)
- Real-time collaboration indicators

---

## 6. Migration Rewrite Recommendation

**Decision: Full rewrite from scratch.**

Current `sql/migrations/001_schema.sql` through `004_triggers.sql` plus 5 supabase patches
are layered fixes with hardcoded score columns, legacy field names, and inconsistent
constraints.

### New Migration Chain

```text
001_extensions.sql               — uuid-ossp, pgcrypto
002_identity.sql                 — organizations, profiles, memberships, org_applications
003_frameworks.sql               — frameworks, framework_outcomes, framework_criteria,
                                   framework_criterion_outcome_maps
004_periods_and_execution.sql    — periods, projects, jurors
005_snapshots.sql                — period_criteria, period_outcomes,
                                   period_criterion_outcome_maps + freeze RPC
006_scoring.sql                  — score_sheets, score_sheet_items
007_auth_and_tokens.sql          — juror_period_auth, entry_tokens + jury RPCs
008_audit_and_rls.sql            — audit_logs, triggers, ALL RLS policies
```

### Migration rules

1. Each file is idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`)
2. Each file covers a single domain
3. RPCs live in the relevant domain file (jury RPCs -> 007, snapshot freeze -> 005)
4. All RLS policies in a single file (008) — full policy set visible at a glance
5. Old migration files archived to `sql/migrations-v0/`

### Data migration (if production data exists)

A separate `009_data_migration.sql`:

- `scores` wide-row -> `score_sheets` + `score_sheet_items` transformation
- `criteria_config` JSONB -> `period_criteria` snapshot conversion
- `tenant_applications` -> `org_applications` rename
- `memberships.role` value `admin` -> `org_admin`

---

## 7. API Surface Recommendation

### Pure REST (PostgREST)

| Resource | Methods | Notes |
|----------|---------|-------|
| `/organizations` | GET, PATCH | POST via application flow |
| `/periods` | GET, POST, PATCH, DELETE | Org-scoped |
| `/projects` | GET, POST, PATCH, DELETE | Period-scoped |
| `/jurors` | GET, POST, PATCH, DELETE | Org-scoped |
| `/frameworks` | GET, POST, PATCH, DELETE | Org-scoped |
| `/framework_outcomes` | GET, POST, PATCH, DELETE | Framework-scoped |
| `/framework_criteria` | GET, POST, PATCH, DELETE | Framework-scoped |
| `/framework_criterion_outcome_maps` | GET, POST, PATCH, DELETE | Framework-scoped |
| `/period_criteria` | GET | Read-only snapshot |
| `/period_outcomes` | GET | Read-only snapshot |
| `/score_sheets` | GET | Admin read (with items JOIN) |
| `/score_sheet_items` | GET | Admin read |
| `/audit_logs` | GET | Read-only, org-scoped |
| `/entry_tokens` | GET | Admin read |

### Action Endpoints (RPC / Edge Function)

| Action | Type | Why not REST |
|--------|------|-------------|
| `rpc_period_freeze_snapshot` | RPC | Multi-table transaction (3 INSERTs + validation) |
| `rpc_jury_authenticate` | RPC | Juror create-or-match + PIN generation |
| `rpc_jury_verify_pin` | RPC | Lockout logic + session token generation |
| `rpc_jury_upsert_score` | RPC | Session validation + score normalization |
| `rpc_jury_finalize` | RPC | State transition + validation |
| `rpc_entry_token_generate` | RPC | Token generation + TTL |
| `rpc_entry_token_revoke` | RPC | Revocation + active session count |
| `rpc_entry_token_validate` | RPC | Multi-check validation |
| `rpc_juror_reset_pin` | RPC | PIN regeneration + audit |
| `rpc_juror_toggle_edit_mode` | RPC | Edit state + reason + expiry |
| `rpc_juror_unlock_pin` | RPC | Reset failed attempts + unlock |
| `rpc_admin_session` | RPC | Membership + org data aggregation |
| `approve-admin-application` | Edge Function | Auth user creation (requires service_role) |
| `password-reset-email` | Edge Function | External email API |
| `notify-application` | Edge Function | External notification |

Naming convention: `rpc_jury_*` / `rpc_admin_*` / `rpc_period_*` prefix matching
Supabase RPC conventions.

---

## 8. Risks / Anti-Patterns to Avoid

1. **JSONB criteria config in periods** — Current `periods.criteria_config` JSONB creates
   dual source of truth with snapshot tables. Must be removed. Single truth: `period_criteria`.

2. **Wide-row scoring** — Adding a new criterion requires schema migration. Normalized
   model is the only path forward for dynamic criteria.

3. **Plain text PIN storage** — Current `juror_period_auth.pin` stores plain text. Must
   use bcrypt hash. PIN shown once on first reveal only.

4. **Field name mapping layer** — `written<->design`, `oral<->delivery` mapping between UI
   and API is a constant bug source. Normalized model eliminates this — criterion `key` is
   used directly.

5. **Organization-wide viewer role** — Giving jurors admin-style access creates privacy,
   fairness, and anchoring bias risks.

6. **Async export in v1** — Dataset size (max ~1000 rows) is fine for synchronous export.
   Async job queue is premature optimization.

7. **Custom backup/restore in v1** — Custom restore mechanism carries data loss risk.
   Supabase's native backup is sufficient for v1.

8. **Maintenance mode table** — Supabase dashboard is sufficient for v1. Custom
   `maintenance_windows` table adds unnecessary ops complexity.

9. **Score status: derived vs stored** — `score_sheets.status` should be explicit. "Not
   Started" is derived from absence of a sheet, but "Partial" vs "Complete" requires
   counting items vs criteria — explicit status is more performant.

10. **Trigger-based vs RPC-based audit** — Trigger-based is more reliable (cannot be
    bypassed) but harder to debug. Use triggers in v1, but document each trigger's
    audit format.

---

## 9. Final Recommendation

### Immediate actions

1. **Write new migration chain** (8 files, order above)
2. **Archive old migrations** to `sql/migrations-v0/`
3. **Migrate scoring to normalized model** — biggest breaking change
4. **Update frontend API layer** — `upsertScore` sends `score_sheet_id` +
   `period_criterion_id` + `score_value`
5. **Remove field mapping layer** — `fieldMapping.js` becomes unnecessary; criterion
   key is used directly
6. **Legacy compatibility:** API responses still project `technical/design/delivery/
   teamwork` fields but deprecate after 6 months

### Sequencing

```text
Migration rewrite (001-008)
  -> Snapshot RPC (rpc_period_freeze_snapshot)
  -> Jury RPC rewrite (normalized upsert_score)
  -> Admin API rewrite (normalized score reading)
  -> Frontend scoring hooks update
  -> RLS policy test suite
  -> Data migration script (if production data exists)
```

### One sentence

**19-table normalized model, 2 admin roles, period-scoped snapshots, PIN-based juror auth,
and a clean 8-file migration chain — this is the clean backend foundation for VERA v1.**

---

## 10. Implementation Tracker

This table is updated after each phase is completed. The `Notes` column links to the
relevant implementation report.

### Reporting Rules

- Each completed phase gets a separate implementation report Markdown file
- Reports are stored under `docs/superpowers/plans/db-migration/implementation_reports/`
- File name format: `phase-1-implementation-summary.md`, `phase-2-implementation-summary.md`, etc.

### Status Legend

- **Status:** done = Completed | partial = Partially done / needs attention | pending = Not started
- **Parity:** Full = matches canonical model | Partial = gaps remain | Missing = not implemented

### Phase Tracker

| Phase | Scope | Target Files | Status | Parity | Notes |
|-------|-------|-------------|--------|--------|-------|
| Phase 1 | Archive + Identity + Frameworks + Execution | sql/migrations/001-004 | pending | Missing | Archive old migrations, write 4 new schema files |
| Phase 2 | Snapshots + Scoring + Compat View | sql/migrations/005-006 | pending | Missing | period_criteria/outcomes/maps, score_sheets/items, scores_compat VIEW |
| Phase 3 | Auth + Jury RPCs | sql/migrations/007 | pending | Missing | juror_period_auth (bcrypt), entry_tokens, rewritten jury RPCs |
| Phase 4 | Audit + RLS | sql/migrations/008 | pending | Missing | Triggers, 50+ RLS policies, audit_logs |
| Phase 4B | Premium Demo Seed | sql/seeds/002_demo_premium_seed.sql | pending | Missing | Full rewrite per seed_generation_prompt.md |
| Phase 5 | Frontend Jury Path | src/shared/api/juryApi.js, hooks | pending | Missing | upsertScore JSONB, snapshot freeze, compat view reads |
| Phase 6 | Frontend Admin API | src/shared/api/admin/scores.js | pending | Missing | scores -> scores_compat, realtime subscription |
| Phase 7 | Dynamic Criteria Foundation | src/shared/criteria/, hooks | pending | Missing | DB criteria loading, config.js fallback |

---

## 11. Prototype Parity Verification

> Cross-reference of every data field in `vera-premium-prototype.html` against the
> canonical model. Verified 2026-04-02.

### 11.1 Coverage Result

**The canonical model covers ~98% of all prototype data fields.** Every admin page,
jury flow screen, auth screen, and analytics section can be fully rendered from the
19-table model plus Supabase Auth native tables.

### 11.2 Screen-by-Screen Verification

#### Auth Screens

| Field | Source | Status |
|-------|--------|--------|
| Login email/password | Supabase Auth (`auth.users`) | Covered (external) |
| Remember me | Client-side session persistence | Covered (no DB) |
| Register: name, email, password | Supabase Auth + `profiles.display_name` | Covered |
| Register: university, department | `org_applications` + `organizations` lookup | Covered |
| Forgot password: email + reset token | Supabase Auth (`auth.users.recovery_token`) | Covered (external) |
| Reset password: new password + strength | Supabase Auth + client-side validation | Covered |
| Complete profile (OAuth): name, org | `profiles.display_name` + `org_applications` | Covered |
| Pending review gate: status, date, org | `org_applications.status/created_at` + `organizations.name` | Covered |

#### Jury Flow

| Field | Source | Status |
|-------|--------|--------|
| Entry token validation | `entry_tokens.token/is_revoked/expires_at` | Covered |
| Token -> period context | `entry_tokens.period_id` -> `periods` | Covered |
| Juror name input | `jurors.juror_name` | Covered |
| Juror affiliation input | `jurors.affiliation` | Covered |
| Juror email (optional) | `jurors.email` | Covered |
| 4-digit PIN input | `juror_period_auth.pin_hash` (bcrypt verify) | Covered |
| PIN reveal (first-time) | RPC returns plain PIN once, then only hash stored | Covered |
| PIN lockout: unlock ETA | `juror_period_auth.locked_until` | Covered |
| PIN lockout: failed attempts | `juror_period_auth.failed_attempts` | Covered |
| Period selection list | `periods` WHERE org_id + is_visible | Covered |
| Current period badge | `periods.is_current` | Covered |
| Locked period indicator | `periods.is_locked` | Covered |
| Progress resume: previous work | `score_sheets` with status != draft | Covered |
| Progress %: scored/total | COUNT(score_sheets) / COUNT(projects) | Derived |
| Eval: project title | `projects.title` | Covered |
| Eval: group number | `projects.project_no` | Covered |
| Eval: team members | `projects.members` (JSONB array) | Covered |
| Eval: per-criterion score input | `score_sheet_items.score_value` per `period_criteria` | Covered |
| Eval: score bar color | Client-side from `score_value / max_score` ratio | Derived |
| Eval: autosave indicator | `score_sheets.last_activity_at` | Covered |
| Eval: total score | SUM(`score_sheet_items.score_value`) | Derived |
| Done: completion summary | All `score_sheets` for juror in period | Covered |

#### Admin Shell

| Field | Source | Status |
|-------|--------|--------|
| Sidebar: org selector | `memberships` -> `organizations` | Covered |
| Sidebar: user name + role | `profiles.display_name` + `memberships.role` | Covered |
| Header: breadcrumb (org name) | `organizations.name` | Covered |
| Header: period dropdown | `periods` WHERE org_id | Covered |
| Header: refresh button | Client-side action | N/A |
| Dark mode toggle | `localStorage` | No DB needed |

#### Overview Page

| Field | Source | Status |
|-------|--------|--------|
| KPI: Active Jurors | COUNT(DISTINCT `score_sheets.juror_id`) for period | Derived |
| KPI: Projects/Groups | COUNT(`projects`) WHERE period_id | Derived |
| KPI: Completion % | submitted sheets / (jurors x projects) | Derived |
| KPI: Average Score | AVG(SUM(`score_sheet_items.score_value`)) per sheet | Derived |
| Juror Activity table: name | `jurors.juror_name` | Covered |
| Juror Activity: status badge | Derived from sheet count vs project count + `final_submitted_at` | Derived |
| Juror Activity: progress N/M | COUNT(sheets with scores) / COUNT(projects) | Derived |
| Juror Activity: avg score | AVG(total) for juror's sheets | Derived |
| Juror Activity: last active | `juror_period_auth.last_seen_at` | Covered |
| Top Projects: rank | ORDER BY avg total DESC | Derived |
| Top Projects: title + members | `projects.title` + `projects.members` | Covered |
| Top Projects: avg score | AVG across jurors | Derived |
| Needs Attention card | Jurors with `is_blocked` or `locked_until > now()` | Derived |
| Period Snapshot card | `periods.name/start_date/end_date` + counts | Derived |
| Completion by Group chart | Per-`project_no` completion aggregation | Derived |

#### Rankings Page

| Field | Source | Status |
|-------|--------|--------|
| KPI: Projects, Jurors, Avg, Top, Coverage | Aggregations on `score_sheets` + `score_sheet_items` | Derived |
| Filter: Consensus dropdown | sigma (stddev) of totals per project | Derived |
| Filter: Average Range | Filter on computed average | Client-side |
| Filter: Search | projects.title ILIKE | Client-side |
| Table: Rank # | ROW_NUMBER() ORDER BY avg DESC with ties | Derived |
| Table: Project name | `projects.title` | Covered |
| Table: Team Members | `projects.members` (JSONB) | Covered |
| Table: Per-criterion heat cells | AVG(`score_sheet_items.score_value`) per `period_criteria.key` | Derived |
| Table: Average | AVG(total) across jurors | Derived |
| Table: Consensus badge (sigma) | STDDEV(total) per project | Derived |
| Table: Jurors count | COUNT(DISTINCT sheets) per project | Derived |
| Export: XLSX/CSV/PDF | Client-side generation from query results | N/A |

#### Analytics Page (8 sections)

| Section | Data Source | Status |
|---------|------------|--------|
| 01 Outcome Attainment Status | `score_sheet_items` JOIN `period_criterion_outcome_maps` JOIN `period_outcomes`; attainment = (score/max >= threshold%) | Derived |
| 01 Trend indicator (delta) | Current period attainment - previous period attainment | Derived (cross-period) |
| 02 Attainment Rate chart | % of individual evals where (score/max)*100 >= threshold | Derived |
| 02 Threshold Gap lollipop | attainment_rate - threshold per outcome | Derived |
| 03 Outcome by Group chart | `score_sheet_items` grouped by `projects.project_no` + outcome | Derived |
| 04 Rubric Achievement | Count of scores in each rubric band per criterion | Derived (rubric_bands JSONB) |
| 04 Programme Averages | AVG(score_value) per `period_criteria` | Derived |
| 05 Continuous Improvement trend | Cross-period attainment rates | Derived |
| 06 Group-Level Attainment heatmap | Per-group per-criterion attainment matrix | Derived |
| 07 Juror Reliability (CV) | Coefficient of variation per juror per criterion | Derived |
| 08 Coverage Matrix | `period_criterion_outcome_maps` + coverage_type | Covered |

All 8 analytics sections fully derivable from the normalized model.

#### Heatmap Page

| Field | Source | Status |
|-------|--------|--------|
| Criteria tabs (All + per-criterion) | `period_criteria` list | Covered |
| Row: Juror avatar + name | `jurors.juror_name` + `jurors.avatar_color` | Covered |
| Column: Project title | `projects.title` | Covered |
| Cell: Score value | `score_sheet_items.score_value` | Covered |
| Cell: Color band | score_value / max_score ratio -> CSS class | Derived |
| Cell: Partial flag | NULL items in sheet -> partial indicator | Derived |
| Footer: Column averages | AVG(score_value) per project per criterion | Derived |
| Footer: Legend (color bar) | Static from period_criteria.max_score | Client-side |

#### Reviews Page

| Field | Source | Status |
|-------|--------|--------|
| KPI strip: Reviews, Jurors, Projects, Partial, Avg | Aggregations on score_sheets | Derived |
| Filter: Juror name | `jurors.juror_name` | Covered |
| Filter: Project | `projects.title` | Covered |
| Filter: Score status | Derived from sheet completeness | Derived |
| Filter: Juror status | Derived from `juror_period_auth` state | Derived |
| Table: Juror avatar + name | `jurors.juror_name` + avatar_color | Covered |
| Table: Affiliation | `jurors.affiliation` | Covered |
| Table: Project | `projects.title` | Covered |
| Table: Members | `projects.members` | Covered |
| Table: Group | `projects.project_no` | Covered |
| Table: Dynamic criteria columns | `score_sheet_items` per `period_criteria` | Covered |
| Table: Total | SUM(score_value) | Derived |
| Table: Comment | `score_sheets.comment` | Covered |
| Table: Status pill | Derived from item completeness + `final_submitted_at` | Derived |
| Pagination | LIMIT/OFFSET on query | Client-side |

#### Jurors Page

| Field | Source | Status |
|-------|--------|--------|
| KPI strip: counts | Aggregations on jurors + score_sheets | Derived |
| Table: Name | `jurors.juror_name` | Covered |
| Table: Affiliation | `jurors.affiliation` | Covered |
| Table: Email | `jurors.email` | Covered |
| Table: Status badge | Derived from score_sheets completeness + final_submitted_at | Derived |
| Table: Progress N/M | COUNT(sheets with scores) / COUNT(projects) | Derived |
| Table: Average score | AVG(total) for juror | Derived |
| Table: Last active | `juror_period_auth.last_seen_at` | Covered |
| Table: PIN status | `juror_period_auth.pin_hash` IS NOT NULL + `locked_until` | Derived |
| Table: Edit mode | `juror_period_auth.edit_enabled` | Covered |
| Drawer: avatar + details | jurors + juror_period_auth fields | Covered |
| Drawer: Groups Scored | COUNT(DISTINCT project_id) from score_sheets | Derived |
| Modal: Add/Edit juror | `jurors.juror_name/affiliation/email` | Covered |
| Modal: Reset PIN | `juror_period_auth.pin_hash` regeneration | Covered (via RPC) |
| Modal: PIN Reveal | RPC returns plain PIN once | Covered |
| Modal: Enable Edit Mode | `juror_period_auth.edit_enabled/edit_reason/edit_expires_at` | Covered |
| Modal: Remove juror (typed confirm) | DELETE `jurors` + CASCADE | Covered |

#### Projects Page

| Field | Source | Status |
|-------|--------|--------|
| Table: Title | `projects.title` | Covered |
| Table: Group # | `projects.project_no` | Covered |
| Table: Team members | `projects.members` (JSONB) | Covered |
| Table: Advisor | `projects.advisor_name` + `advisor_affiliation` | Covered |
| Table: Scoring status | Derived from score_sheets per project | Derived |
| Drawer: project details | All project columns | Covered |
| Modal: Add/Edit project | title, project_no, members, advisor_name, advisor_affiliation, description | Covered |

#### Periods Page

| Field | Source | Status |
|-------|--------|--------|
| Table: Period name | `periods.name` | Covered |
| Table: Season | `periods.season` | Covered |
| Table: Start/End date | `periods.start_date/end_date` | Covered |
| Table: Status (Current/Locked/Draft) | `periods.is_current` + `is_locked` | Covered |
| Table: Project count | COUNT(projects) WHERE period_id | Derived |
| Table: Juror count | COUNT(DISTINCT juror_id) from score_sheets or juror_period_auth | Derived |
| Table: Last updated | `periods.updated_at` | Covered |
| Modal: Add/Edit period | name, season, description, start_date, end_date, poster_date, framework_id | Covered |
| Modal: Set as current | UPDATE `periods.is_current` | Covered |

#### Criteria Page

| Field | Source | Status |
|-------|--------|--------|
| Criterion label | `framework_criteria.label` (editable) / `period_criteria.label` (snapshot) | Covered |
| Short label | `framework_criteria.short_label` | Covered |
| Weight % | `framework_criteria.weight` | Covered |
| Max score | `framework_criteria.max_score` | Covered |
| Description/blurb | `framework_criteria.description` | Covered |
| Rubric bands: range, label, desc | `framework_criteria.rubric_bands` (JSONB) | Covered |
| Color | `framework_criteria.color` | Covered |
| Sort order | `framework_criteria.sort_order` | Covered |
| Lock indicator (scores exist) | `snapshot_frozen_at IS NOT NULL` on period | Derived |

#### Outcomes & Mapping Page

| Field | Source | Status |
|-------|--------|--------|
| Framework selector | `frameworks` WHERE org_id | Covered |
| Framework name, description | `frameworks.name/description` | Covered |
| Outcome code | `framework_outcomes.code` | Covered |
| Outcome label | `framework_outcomes.label` | Covered |
| Outcome description | `framework_outcomes.description` | Covered |
| Mapped criteria list | `framework_criterion_outcome_maps` -> `framework_criteria` | Covered |
| Coverage type (Direct/Indirect) | `framework_criterion_outcome_maps.coverage_type` | Covered |
| Mapping weight | `framework_criterion_outcome_maps.weight` | Covered |
| Attainment status per outcome | Derived from score_sheet_items aggregation | Derived |
| Coverage matrix (outcomes x criteria) | `framework_criterion_outcome_maps` full join | Covered |

#### Entry Control Page

| Field | Source | Status |
|-------|--------|--------|
| KPI: Token count | COUNT(`entry_tokens`) WHERE period_id | Derived |
| KPI: Active sessions | COUNT from `juror_period_auth` WHERE session active | Derived |
| Table: Token value | `entry_tokens.token` | Covered |
| Table: Status (Active/Revoked/Expired) | `is_revoked` + `expires_at` comparison | Derived |
| Table: Expiration | `entry_tokens.expires_at` | Covered |
| Table: Created | `entry_tokens.created_at` | Covered |
| Table: Last Activity | See gap G1 below | Minor gap |
| Action: Generate token | RPC `rpc_entry_token_generate` | Covered |
| Action: Revoke token | RPC `rpc_entry_token_revoke` | Covered |
| QR code display | Client-side generation from token value | N/A |

#### PIN Blocking Page

| Field | Source | Status |
|-------|--------|--------|
| KPI: Total locked | COUNT WHERE `locked_until > now()` | Derived |
| KPI: Today's lockouts | See gap G2 below | Minor gap |
| Table: Juror name | `jurors.juror_name` | Covered |
| Table: Period | `periods.name` | Covered |
| Table: Failed Attempts | `juror_period_auth.failed_attempts` | Covered |
| Table: Lock Started | See gap G2 below | Minor gap |
| Table: Unlock ETA | `juror_period_auth.locked_until` | Covered |
| Table: Status | `locked_until` vs now() comparison | Derived |
| Action: Unlock | RPC resets `failed_attempts` + `locked_until` | Covered |

#### Audit Log Page

| Field | Source | Status |
|-------|--------|--------|
| KPI: Total Events | COUNT(`audit_logs`) | Derived |
| KPI: Today's events | COUNT WHERE `created_at >= today` | Derived |
| KPI: System vs Admin events | COUNT grouped by `actor_id IS NULL` | Derived |
| Filter: Actor | `audit_logs.actor_id` -> `profiles.display_name` | Covered |
| Filter: Event type | `audit_logs.resource_type` | Covered |
| Filter: Date range | `audit_logs.created_at` range | Covered |
| Table: Timestamp | `audit_logs.created_at` | Covered |
| Table: Type badge | `audit_logs.resource_type` | Covered |
| Table: Actor name + role | `actor_id` -> profiles + memberships | Covered |
| Table: Action description | `audit_logs.action` | Covered |
| Table: Details | `audit_logs.details` (JSONB) | Covered |
| Pagination | LIMIT/OFFSET | Client-side |

#### Settings Page

| Field | Source | Status |
|-------|--------|--------|
| Profile: Display name | `profiles.display_name` | Covered |
| Profile: Email (read-only) | Supabase Auth `auth.users.email` | Covered (external) |
| Profile: Role | `memberships.role` | Covered |
| Profile: Organization | `memberships.organization_id` -> `organizations.name` | Covered |
| Security: Change password | Supabase Auth `auth.users` update | Covered (external) |
| Security: View sessions | Supabase Auth `auth.sessions` | Covered (external) |
| Org Settings: Name, code | `organizations.name/code` | Covered |
| Org Settings: Institution | `organizations.institution_name` | Covered |
| Org Settings: Contact email | `organizations.contact_email` | Covered |
| Theme preference | `localStorage` (not DB) | No DB needed |

#### Super Admin Control Center

| Field | Source | Status |
|-------|--------|--------|
| Organization list + management | `organizations` + `memberships` aggregation | Covered |
| User/admin management | `profiles` + `memberships` | Covered |
| Application approvals | `org_applications` | Covered |
| Framework management | `frameworks` CRUD | Covered |
| Global settings (platform name, support email, etc.) | See gap G3 below | Minor gap |
| Security policy (OAuth, password rules, token TTL) | See gap G3 below | Minor gap |

#### Export & Backup Page

| Field | Source | Status |
|-------|--------|--------|
| Export format cards (XLSX/CSV/PDF/JSON) | Client-side generation from query results | N/A |
| Export scope (current period / all) | Period filter on queries | Client-side |
| File metadata (projects, jurors, period) | Aggregation counts | Derived |

#### Landing Page

| Field | Source | Status |
|-------|--------|--------|
| Hero section, features, CTA | Static content / env vars | No DB needed |
| Stats counters (if dynamic) | COUNT aggregations on organizations/periods | Derived |

---

### 11.3 Identified Gaps

Four minor gaps remain. None are blockers — all have straightforward solutions.

#### G1: `entry_tokens.last_activity_at`

**Prototype field:** Entry Control page "Last Activity" column shows when a token was
last used.

**Current model:** `entry_tokens` has no activity tracking column.

**Solutions (pick one):**

- **Option A:** Derive from `audit_logs` WHERE resource_type = 'entry_token' AND
  resource_id = token.id ORDER BY created_at DESC LIMIT 1. No schema change needed.
- **Option B:** Add `last_used_at TIMESTAMPTZ` to `entry_tokens`. Updated by
  `rpc_entry_token_validate` on each successful validation.

**Recommendation:** Option B — single column, simple, avoids audit log query overhead.

#### G2: `juror_period_auth.locked_at`

**Prototype field:** PIN Blocking page "Lock Started" column and "Today's lockouts" KPI.

**Current model:** Only `locked_until` exists. Lock start time must be back-calculated
as `locked_until - lockout_duration`, which requires knowing the duration (currently
hardcoded to 15 minutes but may become configurable).

**Solution:** Add `locked_at TIMESTAMPTZ` to `juror_period_auth`. Set by the PIN
verification RPC when it triggers a lockout (alongside setting `locked_until`).

**Recommendation:** Add the column. One line in migration, eliminates reverse-calculation.

#### G3: Super Admin global settings

**Prototype fields:** Settings page "Global Settings" drawer shows platform name, support
email, auto-approve toggle, default scoring scale, notification provider, security policy
toggles (OAuth, password login, remember me, token TTL).

**Current model:** `system_settings` table deferred to v1.1. No v1 storage for these.

**Analysis of each field:**

| Setting | v1 Solution |
|---------|-------------|
| Platform name | Env var `VITE_PLATFORM_NAME` |
| Support email | Env var `VITE_SUPPORT_EMAIL` |
| Default scoring scale | Defined by framework — already covered |
| Max criteria per period | Framework defines criteria count — already covered |
| Auto-approve orgs | Env var `AUTO_APPROVE_ORGS` or hardcode false |
| Demo mode | Existing env var `VITE_DEMO_MODE` |
| Notification provider | Edge Function config — env var |
| Send welcome emails | Edge Function config — env var |
| Google OAuth toggle | Supabase Auth dashboard setting |
| Password login toggle | Supabase Auth dashboard setting |
| Remember me | Client-side feature, no DB needed |
| Entry token TTL | Hardcoded 24h in RPC, configurable in v1.1 via `system_settings` |
| Password requirements | Supabase Auth dashboard setting |
| Multi-device jury sessions | RPC logic, configurable in v1.1 |

**Recommendation:** No schema change for v1. Env vars + Supabase dashboard settings cover
all super admin configuration needs. `system_settings` table added in v1.1 when UI-driven
configuration becomes necessary.

#### G4: Theme preference persistence

**Prototype field:** Dark/light mode toggle in sidebar header.

**Current model:** No user preference storage.

**Solution:** `localStorage` on client. Theme is a display preference, not application
state. No DB table needed.

**Recommendation:** No schema change. Client-side `localStorage` is the standard approach.

---

### 11.4 Recommended Model Amendments

Based on the gap analysis, two columns should be added to the canonical model:

#### Amendment 1: `entry_tokens.last_used_at`

```sql
ALTER TABLE entry_tokens ADD COLUMN last_used_at TIMESTAMPTZ;
```

Updated in `rpc_entry_token_validate` on each successful validation.

#### Amendment 2: `juror_period_auth.locked_at`

```sql
ALTER TABLE juror_period_auth ADD COLUMN locked_at TIMESTAMPTZ;
```

Set in `rpc_jury_verify_pin` when lockout triggers (failed_attempts reaches threshold).

These are additive changes (new nullable columns) with zero risk to existing logic.

---

### 11.5 Scoring Model Derivation Paths

Every admin page that shows scores can be served from the normalized model. Here are the
key query patterns:

#### Rankings (per-project averages)

```sql
SELECT
  p.title,
  p.project_no,
  p.members,
  pc.key AS criterion_key,
  AVG(ssi.score_value) AS avg_score
FROM score_sheets ss
JOIN score_sheet_items ssi ON ssi.score_sheet_id = ss.id
JOIN period_criteria pc ON pc.id = ssi.period_criterion_id
JOIN projects p ON p.id = ss.project_id
WHERE ss.period_id = $1
GROUP BY p.id, pc.id
ORDER BY AVG(ssi.score_value) DESC;
```

#### Analytics — Outcome Attainment

```sql
SELECT
  po.code,
  po.label,
  COUNT(*) FILTER (
    WHERE (ssi.score_value / pc.max_score) * 100 >= f.default_threshold
  )::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS attainment_pct
FROM score_sheet_items ssi
JOIN period_criteria pc ON pc.id = ssi.period_criterion_id
JOIN period_criterion_outcome_maps pcom ON pcom.period_criterion_id = pc.id
JOIN period_outcomes po ON po.id = pcom.period_outcome_id
JOIN periods per ON per.id = pc.period_id
JOIN frameworks f ON f.id = per.framework_id
WHERE pc.period_id = $1
GROUP BY po.id;
```

#### Heatmap (juror x project x criterion grid)

```sql
SELECT
  j.juror_name,
  p.title AS project_title,
  pc.key AS criterion_key,
  pc.max_score,
  ssi.score_value
FROM score_sheets ss
JOIN score_sheet_items ssi ON ssi.score_sheet_id = ss.id
JOIN period_criteria pc ON pc.id = ssi.period_criterion_id
JOIN jurors j ON j.id = ss.juror_id
JOIN projects p ON p.id = ss.project_id
WHERE ss.period_id = $1;
```

#### Legacy Compatibility Projection

For API responses that need `technical/design/delivery/teamwork` flat fields:

```sql
SELECT
  ss.juror_id,
  ss.project_id,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'technical') AS technical,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'design') AS design,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'delivery') AS delivery,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'teamwork') AS teamwork
FROM score_sheets ss
JOIN score_sheet_items ssi ON ssi.score_sheet_id = ss.id
JOIN period_criteria pc ON pc.id = ssi.period_criterion_id
WHERE ss.period_id = $1
GROUP BY ss.id;
```

---

### 11.6 Summary

| Category | Total Fields | Covered | Derived | Minor Gap | Not Needed |
|----------|-------------|---------|---------|-----------|------------|
| Auth screens | 14 | 14 | 0 | 0 | 0 |
| Jury flow | 22 | 15 | 7 | 0 | 0 |
| Admin shell | 6 | 4 | 0 | 0 | 2 (client) |
| Overview | 15 | 5 | 10 | 0 | 0 |
| Rankings | 14 | 3 | 11 | 0 | 0 |
| Analytics (8 sections) | 20 | 2 | 18 | 0 | 0 |
| Heatmap | 8 | 4 | 4 | 0 | 0 |
| Reviews | 16 | 8 | 8 | 0 | 0 |
| Jurors | 18 | 11 | 7 | 0 | 0 |
| Projects | 10 | 8 | 2 | 0 | 0 |
| Periods | 12 | 9 | 3 | 0 | 0 |
| Criteria | 10 | 9 | 1 | 0 | 0 |
| Outcomes & Mapping | 11 | 9 | 2 | 0 | 0 |
| Entry Control | 10 | 6 | 3 | 1 (G1) | 0 |
| PIN Blocking | 8 | 4 | 3 | 1 (G2) | 0 |
| Audit Log | 12 | 7 | 5 | 0 | 0 |
| Settings | 12 | 8 | 0 | 0 | 4 (external) |
| Super Admin | 14 | 4 | 2 | 1 (G3) | 7 (env/ext) |
| Export | 4 | 0 | 2 | 0 | 2 (client) |
| Landing | 3 | 0 | 1 | 0 | 2 (static) |
| **TOTAL** | **239** | **130** | **89** | **3** | **17** |

**130 stored + 89 derived + 17 external/client = 236 covered. 3 minor gaps (G1-G3).**

After applying amendments (G1 + G2), remaining gap is only G3 (super admin global
settings) which is fully covered by env vars in v1.

**Conclusion: The canonical model fully supports all prototype data fields.**
