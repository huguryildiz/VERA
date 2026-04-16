# Period Lifecycle & Publish Model

This document captures the redesign of VERA's period "status" and "lock" mechanism. It records the as-is behavior, the problems identified, and the target model.

**Last updated:** 2026-04-16
**Status:** Design approved — implementation pending.

---

## 1. As-Is: How Status and Lock Work Today

### Status is derived, not stored

There is no `status` column on `periods`. The UI derives a status label from two booleans and one timestamp:

```
is_locked = true                 → "locked"
is_current = true                → "active"
activated_at IS NOT NULL         → "completed"
(otherwise)                      → "draft"
```

See `getPeriodStatus` in `src/admin/pages/PeriodsPage.jsx`.

### Lock is triggered automatically by the first QR token

The moment an admin generates the first QR entry token for a period, `trigger_auto_lock_period_on_token` fires and sets `is_locked = true`. From then on, structural content of the period is frozen via BEFORE triggers on:

- `projects` (all writes blocked)
- `period_criteria`, `period_outcomes`, `period_criterion_outcome_maps` (all writes blocked)
- `periods` itself (protected columns: name, season, description, start_date, end_date, framework_id, is_visible, organization_id)
- `jurors` (UPDATE/DELETE blocked if the juror is assigned to any locked period)

Intentionally mutable even while locked:

- `juror_period_auth` rows (PIN, session, edit-mode runtime state)
- `scores` and `score_feedback`
- `entry_tokens` INSERT (the lock trigger itself lives here)
- `jurors` INSERT (new juror registration stays allowed via `rpc_jury_authenticate`)
- `periods.is_locked`, `is_current`, `activated_at`, `snapshot_frozen_at`

### Unlock branches on "has scores"

- **No scores yet** → org admin can unlock directly via `rpc_admin_set_period_lock(_, false)`.
- **Scores exist** → direct unlock is rejected with `cannot_unlock_period_has_scores`. The UI quietly redirects to `RequestUnlockModal`, which calls `rpc_admin_request_unlock`. Super admin approval resolves the request via `rpc_super_admin_resolve_unlock`.

### QR generation has no business prerequisites

`rpc_admin_generate_entry_token` only checks:

1. Period exists.
2. Caller is super admin or a member of the period's org.
3. Reads `qrTtl` from `security_policy`.

It does not verify projects, criteria, framework, or rubric completeness. A period with zero projects and zero criteria can still transition to "locked" via QR generation — a structurally frozen but functionally useless state.

---

## 2. Problems

1. **"Lock" is doing too many jobs.** The original intent ("prevent external DB writes") is now handled by RLS + SECURITY DEFINER RPCs. The current lock is actually a fairness guard against structural changes mid-scoring. That is a lifecycle concern, not a lock.
2. **Status model is brittle.** Four labels encoded in two booleans plus one timestamp, with no transition rules. `completed` has no schema backing.
3. **Manual lock button is redundant.** QR generation already auto-locks.
4. **Publish is invisible.** No explicit publish action, no readiness check, no list of unmet requirements.
5. **"Unlock" reads as undo, not edit.** Admins reverting really want "pull back to Draft, fix something, republish."
6. **UX surprise in unlock flow.** Clicking "Unlock Period" opens a modal that silently closes and reopens as a different modal when scores exist.

---

## 3. Target Model — 5 Lifecycle States

```
┌────────────────────┐   checklist passes    ┌────────────────┐
│ Draft ·            │   (auto, reversible)   │ Draft ·        │
│ Incomplete         │ ─────────────────────> │ Ready          │
│                    │ <───────────────────── │                │
└────────────────────┘   user edits            └───────┬────────┘
                                                       │ admin clicks Publish
                                                       ▼
                                              ┌────────────────┐
                                              │ Published      │  QR issuable
                                              │ (locked,       │  no scores yet
                                              │ no scores)     │
                                              └───────┬────────┘
                                                      │ first score submitted (auto)
                                                      ▼
                                              ┌────────────────┐
                                              │ Live           │  scoring in progress
                                              │ (locked,       │
                                              │ scoring)       │
                                              └───────┬────────┘
                                                      │ admin clicks Close Period
                                                      ▼
                                              ┌────────────────┐
                                              │ Closed         │  finalized
                                              │ (terminal)     │
                                              └────────────────┘

Revert flows (all return to Draft):
  Published → Draft   : org admin direct (no scores)
  Live      → Draft   : unlock-request + super admin approval
  Closed    → Draft   : unlock-request + super admin approval
```

### 3.1 State properties

| State                   | `is_locked` | `activated_at` | `closed_at` | Structural edits | QR generation | Accepts scores |
|-------------------------|-------------|----------------|-------------|------------------|---------------|----------------|
| **Draft · Incomplete**  | false       | null           | null        | yes              | no            | no             |
| **Draft · Ready**       | false       | null           | null        | yes              | no            | no             |
| **Published**           | true        | set            | null        | no               | yes           | no (none yet)  |
| **Live**                | true        | set            | null        | no               | yes           | yes            |
| **Closed**              | true        | set            | set         | no               | no            | no             |

### 3.2 State derivation rules

All five states are derived from existing columns plus one new `closed_at TIMESTAMPTZ` column (added in v1):

```js
function getPeriodState(period, hasScores, readiness) {
  if (period.closed_at) return "closed";
  if (period.is_locked && hasScores) return "live";
  if (period.is_locked)              return "published";
  return readiness.ok ? "draft_ready" : "draft_incomplete";
}
```

**Draft · Incomplete ↔ Draft · Ready is not a transition.** It is a computed UI attribute of Draft, driven by the readiness check. Changes are instant and automatic — editing criteria can flip a period between the two sub-states without any admin action.

**Transitions (all deliberate):**

| From        | To          | Trigger                              | Actor                |
|-------------|-------------|--------------------------------------|----------------------|
| Draft       | Published   | `rpc_admin_publish_period` call      | Admin (manual)       |
| Published   | Live        | First score row inserted             | System (automatic)   |
| Live        | Closed      | `rpc_admin_close_period` call        | Admin (manual)       |
| Published   | Draft       | `rpc_admin_set_period_lock(_,false)` | Admin (manual)       |
| Live        | Draft       | Unlock request + super admin approve | Admin + super admin  |
| Closed      | Draft       | Unlock request + super admin approve | Admin + super admin  |

### 3.3 Orthogonal concepts

These do not belong to the lifecycle but are often confused with it:

- **`is_current`** — admin convenience flag. Marks the period the organization considers "the current term." One per org. Any lifecycle state can be current, including Draft.
- **`is_visible`** — jury-listing visibility. Independent of lifecycle.

---

## 4. Minimum Publish Checklist

`rpc_admin_check_period_readiness` validates these. Period cannot publish while any required check fails.

**Required:**

| Check                               | Reason                                                               |
|-------------------------------------|----------------------------------------------------------------------|
| `criteria_name` is set              | Criteria set shown to jurors must have a label                       |
| ≥1 criterion exists                 | Nothing to score without criteria                                    |
| Criterion weights total = 100       | Score aggregation assumes normalized weights                         |
| Each criterion has rubric bands     | Rubric-based scoring UI requires bands                               |
| ≥1 project exists                   | Jurors need something to evaluate                                    |

**Optional (shown as informational, do not block publish):**

| Check                               | Why optional                                                         |
|-------------------------------------|----------------------------------------------------------------------|
| Framework assigned + outcome map    | Only needed for MÜDEK/ABET reporting; does not affect scoring        |
| ≥1 juror pre-registered             | Jurors can self-register via `rpc_jury_authenticate` on QR scan      |
| `start_date` / `end_date` filled    | Metadata only                                                        |
| Project metadata completeness       | Affects presentation, not scoring                                    |

**Handled automatically (no admin action required):**

- `snapshot_frozen_at` — jury flow freezes lazily on first load.
- `activated_at` — set by `rpc_admin_publish_period`.

**Explicitly out of scope for v1:**

- Juror–project assignment. Today every juror can score every project (no assignment table exists). If per-juror project subsets become a requirement, that is a separate feature.

---

## 5. Admin User Journey

### 5.1 Period created
- Admin clicks "Add Period", enters name + dates.
- **State: Draft · Incomplete**
- Row shows red badge: "5 issues before publish"
- Kebab menu shows "Publish Period" disabled (tooltip: "Fix 5 issues first").

### 5.2 Admin inspects issues
- Clicks the red badge → drawer opens listing the 5 unmet checks with "Fix" links to Criteria/Projects pages.

### 5.3 Admin fills gaps
- Adds criteria, sets weights to 100, names the criteria set, defines rubric bands, adds projects.
- Badge count decrements in real time: 5 → 4 → … → 0.

### 5.4 All checks green
- **State: Draft · Ready**
- Badge turns green: "Ready to publish"
- Kebab "Publish Period" becomes enabled.

### 5.5 Admin publishes
- Clicks "Publish Period" → confirm modal: "Publish [Name]? Structural data will be frozen. You can still add new jurors and generate QR codes."
- On confirm: `rpc_admin_publish_period` runs, sets `is_locked=true`, `activated_at=now()`.
- **State: Published**
- Badge turns blue: "Published". Kebab swaps "Publish" for **"Generate QR"** and **"Revert to Draft"**.

### 5.6 Admin generates QR
- "Generate QR" → `rpc_admin_generate_entry_token` → QR displayed / shareable.
- **State unchanged: Published** (QR issuance is no longer a lifecycle transition).

### 5.7 First juror scores
- Juror scans QR, registers, submits first score.
- **State: Live** (automatic)
- Badge turns green: "Live — scoring in progress" with progress bar.

### 5.8 Admin wants to fix something

**5.8a. No scores yet (Published):**

- Kebab → "Revert to Draft" → confirm modal: "Revert [Name]? Structural editing will be re-enabled. QR tokens will be revoked."
- On confirm: direct revert. Period returns to Draft.

**5.8b. Scores exist (Live or Closed):**

- Kebab → "Revert to Draft" → modal: "This period has scores. Super admin approval required. Explain why (≥10 chars)."
- `rpc_admin_request_unlock` creates a pending request.
- Row shows "Revert requested" badge; kebab entry grays out.
- Super admin sees the request in Platform Governance; approval returns period to Draft, rejection removes the badge.

### 5.9 All jurors finished, admin closes
- Overview shows "All jurors completed".
- Admin → kebab → **"Close Period"** (visible only in Live).
- Confirm modal: "Close [Name]? No new scores will be accepted. Final rankings will be archived."
- On confirm: `rpc_admin_close_period` runs, sets `closed_at=now()`.
- **State: Closed**
- Badge turns gray: "Closed". "Generate QR" disappears. Only "View Rankings / Export / Revert to Draft (super admin)" remain.

### 5.10 Historical view
- Closed periods stay in the list but muted. Fully exportable from Rankings/Analytics as historical data.

### 5.11 Summary

| When                          | State              | Badge                        | Allowed actions                     |
|-------------------------------|--------------------|------------------------------|-------------------------------------|
| Just created                  | Draft · Incomplete | Red "N issues"               | Edit                                |
| Checklist passes              | Draft · Ready      | Green "Ready to publish"     | Edit, Publish                       |
| Publish confirmed             | Published          | Blue "Published"             | Generate QR, Revert                 |
| First score submitted         | Live               | Green "Live — N% done"       | Generate QR, Revert (with approval) |
| Admin closes                  | Closed             | Gray "Closed"                | View, Export, Revert (super admin)  |

---

## 6. Rollout Plan

Each step is independently deployable. Order matters.

1. **Schema migration: add `closed_at`.** Single column on `periods`, nullable timestamp. Update `002_tables.sql`. Apply to vera-prod and vera-demo.
2. **Readiness check RPC + UI badge.** Add `rpc_admin_check_period_readiness`. In PeriodsPage, Draft rows show "N issue(s) before publish" badge with a click-to-inspect drawer. No behavior change yet.
3. **Publish RPC + button.** Add `rpc_admin_publish_period`. Kebab on Draft rows gains "Publish Period" (disabled while readiness fails). Manual "Lock Period" entry removed. `LockPeriodModal` deleted.
4. **QR gate + trigger removal.** Remove `trigger_auto_lock_period_on_token`. Add check in `rpc_admin_generate_entry_token` that rejects unless period is Published.
5. **Close RPC + button.** Add `rpc_admin_close_period`. Kebab on Live rows gains "Close Period".
6. **Status model rename.** Update `getPeriodState` to return the 5-state model in §3.2. Rename pills, filter options, lifecycle bar segments. `active` / `completed` labels disappear.
7. **"Revert to Draft" rename.** Rename `UnlockPeriodModal` → `RevertToDraftModal`. Underlying RPCs unchanged.
8. **Setup Wizard integration.** Wizard's final step becomes "Publish" using the readiness RPC. Missing checks render inline.

**Migration footprint:**

- Step 1: single column addition to `002_tables.sql` (the one and only schema migration).
- Steps 2, 3, 4, 5: add or modify RPCs in `006_rpcs_admin.sql`.
- Step 4 also removes one trigger from `003_helpers_and_triggers.sql`.
- Steps 6, 7, 8: UI-only.

Apply all DB changes to vera-prod and vera-demo in the same step.

---

## 7. Decisions Recorded

- **Draft is one state with two UI sub-labels (Incomplete/Ready).** Not two states. Readiness is a derived UI flag, not a stored transition — it reacts instantly to edits.
- **Closed ships in v1.** Requires the single `closed_at` migration. Without it, "finished periods" have no clean terminal state.
- **`is_current` stays orthogonal.** Not part of the lifecycle. Any state can be the organization's current period.
- **Live → Published regression is not allowed.** Once scores exist, the only path back is a Revert to Draft with approval. No "quiet roll-back" path.
- **No juror–project assignment in v1.** Jurors continue to see all projects. Per-juror subsets are a separate future feature.

---

**Document date:** 2026-04-16
