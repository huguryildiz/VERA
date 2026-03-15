# Claude Prompt — Supabase Migration (TEDU Capstone Jury Portal)

You are working on an existing React + Vite project: `tedu-capstone-portal`.
The current app is a PIN-based jury portal (no email/password auth) with an Admin panel.

Goal: Replace Google Sheets/GAS backend with Supabase Postgres **using RPC-first design** (no direct table access from frontend anon key).
Add semester filtering and admin dashboard summary.

## Current DB Schema (already created)

Tables:

- `public.semesters`
  - `id uuid pk`
  - `code text unique` (e.g., `2024-Spring`)
  - `name text`
  - `starts_on date`, `ends_on date`
  - `is_active bool default false`
  - `created_at timestamptz default now()`

- `public.projects`
  - `id uuid pk`
  - `semester_id uuid fk -> semesters(id)`
  - `group_no int`
  - `project_title text`
  - `group_students text`
  - `created_at timestamptz default now()`

- `public.jurors`
  - `id uuid pk`
  - `juror_code text unique` and must be **exactly 4 digits** (`^[0-9]{4}$`)
  - `juror_name text`
  - `juror_inst text`
  - `created_at timestamptz default now()`

- `public.scores`
  - `id uuid pk`
  - `semester_id uuid fk -> semesters(id)`
  - `project_id uuid fk -> projects(id)`
  - `juror_id uuid fk -> jurors(id)`
  - `technical int` (0–30)
  - `written int` (0–30)
  - `oral int` (0–30)
  - `teamwork int` (0–10)
  - `total int` (0–100) should be computed in DB
  - `comment text` (one per score submission)
  - `submitted_at timestamptz`
  - `created_at timestamptz default now()`
  - Must have `unique (semester_id, project_id, juror_id)`

- `public.settings`
  - `key text pk`
  - `value text`
  - `updated_at timestamptz default now()`

Notes:
- Supabase Auth is NOT used for jurors (no Users needed).
- PIN login uses `jurors.juror_code` (4 digit).

## New Requirement: Project Notes (Admin-only, one per project)
Add table `public.project_notes`:

- `id uuid pk default gen_random_uuid()`
- `semester_id uuid not null fk -> semesters(id)`
- `project_id uuid not null fk -> projects(id)`
- `note text not null default ''`
- `updated_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`
- `unique (semester_id, project_id)`

These notes are **admin-only** (jury must not read/write them).

## App UX Requirements

### Jury flow
1) Juror enters PIN (4-digit code).
2) App validates PIN via Supabase RPC and receives juror profile.
3) Juror chooses **semester** (or auto-select active semester if exactly one active).
4) App lists projects for that semester (show `Group {group_no} — {project_title}`, and students).
5) Juror can score each project once; can edit previously submitted scores (upsert).
6) Score fields: technical, written, oral, teamwork + optional single comment.
7) Total is computed by DB; frontend should show computed total returned from DB.

### Admin flow
1) Admin panel has an **admin password** (existing UX).
2) Add semester dropdown in admin panel: selects which semester’s data is shown.
3) Admin panel needs a summary view per project:

`v_active_project_summary` (or RPC returning same shape) with columns:
- `project_id`
- `project_title`
- `group_no`
- `avg_total`
- `juror_count`
- `avg_technical`
- `avg_written`
- `avg_oral`
- `avg_teamwork`
- `note` (from project_notes, if exists)
- `note_updated_at`

Admin can edit/save project note (one note per project).

## Security / Architecture Requirements (IMPORTANT)

We are using Supabase **anon key** on the frontend.
Therefore:
- Turn on RLS for tables.
- Do NOT allow public direct select/insert/update on tables from anon.
- Use RPC functions (SECURITY DEFINER) to implement allowed reads/writes.
- Implement admin authentication using `settings.admin_password_hash` (do NOT store plaintext).

### Admin password
- Store password hash in `public.settings`:
  - key = `admin_password_hash`
  - value = bcrypt/argon hash (choose one and implement in SQL)
- Implement `rpc_admin_login(password text) returns boolean` (or returns token).
- For MVP, it’s acceptable to require admin password on each admin RPC (or create a short-lived token and validate it).

### Juror PIN login
- Implement `rpc_juror_login(pin text) returns (juror_id uuid, juror_name text, juror_inst text)` and reject invalid pins.

## Implementation Tasks

### A) SQL / DB changes to apply (write SQL migration scripts)
1) Ensure constraints:
   - juror_code 4 digits check
   - scores unique (semester_id, project_id, juror_id)
   - score ranges (0–30 / 0–10)
2) Add `project_notes` table.
3) Add DB computation of `scores.total`:
   - Prefer BEFORE INSERT/UPDATE trigger:
     total = coalesce(technical,0)+coalesce(written,0)+coalesce(oral,0)+coalesce(teamwork,0)
   - Also set `submitted_at = now()` on insert/update when any score fields are present.
4) Create admin summary:
   - Either create view `v_active_project_summary` parameterized by semester is not possible; so prefer RPC:
     `rpc_admin_project_summary(semester_id uuid, admin_password text) returns table (...)`
   - It must join projects + scores aggregation + project_notes.
5) Create RPCs (SECURITY DEFINER) for:
   - `rpc_list_semesters()` (public)
   - `rpc_get_active_semester()` (public)
   - `rpc_juror_login(pin text)` (public)
   - `rpc_list_projects(semester_id uuid, juror_id uuid)` (public after juror login; you may not enforce juror_id check for MVP but do not expose more than needed)
   - `rpc_upsert_score(...)` (public after juror login)
   - Admin:
     - `rpc_admin_login(password text)` (or token)
     - `rpc_admin_project_summary(semester_id uuid, admin_password text)`
     - `rpc_admin_get_project_note(semester_id uuid, project_id uuid, admin_password text)`
     - `rpc_admin_set_project_note(semester_id uuid, project_id uuid, note text, admin_password text)` updates/creates note

6) Apply RLS:
   - Default deny on tables.
   - Allow access via SECURITY DEFINER RPC only.

### B) Frontend changes (React)
1) Create `src/lib/supabaseClient.js` using env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2) Remove old GAS/Sheets API calls and replace with Supabase RPC calls.
3) Implement:
   - Semester list fetch on app start (or in pages).
   - Jury PIN login uses `rpc_juror_login`.
   - Jury selects semester (default to active).
   - Projects list uses `rpc_list_projects`.
   - Score submit uses `rpc_upsert_score`, display returned computed total.
4) Admin:
   - Add semester dropdown.
   - After admin login, fetch summary via `rpc_admin_project_summary`.
   - Add UI to edit project note (load + save via RPC).

### C) Dev UX
1) Add `.env.local.example` with placeholders for Supabase keys.
2) Ensure app runs with `npm run dev`.

## Acceptance Criteria
- App loads without errors.
- Jury PIN login works using 4-digit codes in `jurors`.
- Jury can select semester and score projects; scores saved in `scores` with computed total.
- Admin can select semester and see aggregated metrics per project.
- Admin can edit per-project note (stored in project_notes).
- No direct table writes from frontend; use RPC.
- RLS enabled and prevents anonymous raw table access.

## Notes / Constraints
- Do not use Supabase Auth Users for jurors.
- Admin password should not be stored or transmitted in plaintext beyond what is needed for MVP.
- Keep code clean and minimal; do not refactor unrelated UI.

Deliverables:
1) SQL migration scripts (one or multiple)
2) Updated frontend code changes (commit-style output, list modified files and key diffs)
3) Brief instructions for running locally and setting env vars