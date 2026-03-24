-- ============================================================
-- 001_schema.sql
-- Extensions, tables, constraints, indexes, view.
-- Extracted from 000_bootstrap.sql (move-only refactor).
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS extensions;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL   ON SCHEMA public TO postgres, service_role;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.semesters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  is_active   boolean NOT NULL DEFAULT false,
  is_locked   boolean NOT NULL DEFAULT false,
  poster_date date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id    uuid NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  group_no       integer NOT NULL,
  project_title  text NOT NULL,
  group_students text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jurors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  juror_name text NOT NULL,
  juror_inst text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id     uuid NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES public.projects(id)  ON DELETE CASCADE,
  juror_id        uuid NOT NULL REFERENCES public.jurors(id)    ON DELETE CASCADE,
  poster_date     date,
  criteria_scores jsonb,
  total           integer,
  comment         text,
  final_submitted_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.juror_semester_auth (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  juror_id        uuid NOT NULL REFERENCES public.jurors(id)    ON DELETE CASCADE,
  semester_id     uuid NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  pin_hash        text NOT NULL,
  pin_reveal_pending boolean NOT NULL DEFAULT false,
  pin_plain_once  text, -- encrypted base64 with "enc:" prefix (legacy rows may be plaintext)
  created_at      timestamptz NOT NULL DEFAULT now(),
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until    timestamptz,
  last_seen_at    timestamptz,
  edit_enabled    boolean NOT NULL DEFAULT false,
  session_token_hash text,
  session_expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  actor_type  text NOT NULL CHECK (actor_type IN ('admin', 'juror', 'system')),
  actor_id    uuid,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   uuid,
  message     text NOT NULL,
  metadata    jsonb
);

-- ── Schema upgrades / legacy cleanup (idempotent) ───────────
ALTER TABLE public.semesters ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.semesters ADD COLUMN IF NOT EXISTS poster_date date;
ALTER TABLE public.semesters ADD COLUMN IF NOT EXISTS is_locked              boolean NOT NULL DEFAULT false;
ALTER TABLE public.semesters ADD COLUMN IF NOT EXISTS entry_token_hash        text;
ALTER TABLE public.semesters ADD COLUMN IF NOT EXISTS entry_token_enabled     boolean NOT NULL DEFAULT false;
ALTER TABLE public.semesters ADD COLUMN IF NOT EXISTS entry_token_created_at  timestamptz;
ALTER TABLE public.semesters ADD COLUMN IF NOT EXISTS entry_token_expires_at  timestamptz;
ALTER TABLE public.projects  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_semesters_entry_token_hash
  ON public.semesters (entry_token_hash)
  WHERE entry_token_hash IS NOT NULL;

-- Encrypt legacy pin_plain_once values if a secret is configured.
-- Requires a Vault secret named 'pin_secret'
DO $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'pin_secret'
  LIMIT 1;
  IF v_secret IS NOT NULL AND v_secret <> '' THEN
    UPDATE juror_semester_auth
    SET pin_plain_once = 'enc:' || encode(pgp_sym_encrypt(pin_plain_once, v_secret), 'base64')
    WHERE pin_plain_once IS NOT NULL
      AND pin_plain_once <> ''
      AND pin_plain_once NOT LIKE 'enc:%';
  END IF;
END;
$$;

-- Normalize empty password hashes to NULL (legacy/manual rows)
UPDATE public.settings
SET value = NULL
WHERE key IN ('admin_password_hash', 'delete_password_hash', 'backup_password_hash')
  AND (value IS NULL OR value = '');

-- Remove rpc_secret from settings table — migrated to Supabase Vault.
DELETE FROM public.settings WHERE key = 'rpc_secret';

-- Enforce unique group numbers per semester (safety for concurrent inserts).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM projects
    GROUP BY semester_id, group_no
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'project_group_duplicate';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS projects_semester_group_no_key
  ON public.projects (semester_id, group_no);

-- Enforce unique semester names (case-insensitive) and dedupe existing rows.
-- Use a temp table so the dedupe set can be reused across multiple statements.
DROP TABLE IF EXISTS tmp_semester_dups;
CREATE TEMP TABLE tmp_semester_dups AS
WITH ranked AS (
  SELECT
    id,
    lower(trim(name)) AS lname,
    is_active,
    updated_at,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim(name))
      ORDER BY
        is_active DESC,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY lower(trim(name))
      ORDER BY
        is_active DESC,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id ASC
    ) AS keep_id
  FROM public.semesters
  WHERE name IS NOT NULL AND trim(name) <> ''
)
SELECT id, keep_id
FROM ranked
WHERE rn > 1;

UPDATE public.projects p
SET semester_id = d.keep_id
FROM tmp_semester_dups d
WHERE p.semester_id = d.id;

UPDATE public.scores s
SET semester_id = d.keep_id
FROM tmp_semester_dups d
WHERE s.semester_id = d.id;

UPDATE public.juror_semester_auth jsa
SET semester_id = d.keep_id
FROM tmp_semester_dups d
WHERE jsa.semester_id = d.id;

UPDATE public.audit_logs al
SET entity_id = d.keep_id
FROM tmp_semester_dups d
WHERE al.entity_type = 'semester' AND al.entity_id = d.id;

DELETE FROM public.semesters s
USING tmp_semester_dups d
WHERE s.id = d.id;

CREATE UNIQUE INDEX IF NOT EXISTS semesters_name_ci_unique
  ON public.semesters (lower(trim(name)));
ALTER TABLE public.jurors    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.scores    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.scores    ADD COLUMN IF NOT EXISTS poster_date date;
ALTER TABLE public.scores    ADD COLUMN IF NOT EXISTS final_submitted_at timestamptz;
ALTER TABLE public.scores    DROP COLUMN IF EXISTS submitted_at;
ALTER TABLE public.juror_semester_auth ADD COLUMN IF NOT EXISTS edit_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.juror_semester_auth ADD COLUMN IF NOT EXISTS pin_reveal_pending boolean NOT NULL DEFAULT false;
ALTER TABLE public.juror_semester_auth ADD COLUMN IF NOT EXISTS pin_plain_once text;
ALTER TABLE public.juror_semester_auth ADD COLUMN IF NOT EXISTS session_token_hash text;
ALTER TABLE public.juror_semester_auth ADD COLUMN IF NOT EXISTS session_expires_at timestamptz;

-- Remove legacy columns if present
ALTER TABLE public.semesters          DROP COLUMN IF EXISTS starts_on;
ALTER TABLE public.semesters          DROP COLUMN IF EXISTS ends_on;
ALTER TABLE public.scores             DROP COLUMN IF EXISTS starts_on;
ALTER TABLE public.scores             DROP COLUMN IF EXISTS ends_on;
ALTER TABLE public.juror_semester_auth DROP COLUMN IF EXISTS edit_expires_at;
ALTER TABLE public.juror_semester_auth DROP COLUMN IF EXISTS final_submitted_at;

-- Backfill scores.poster_date from semesters if missing
UPDATE public.scores sc
SET poster_date = s.poster_date
FROM public.semesters s
WHERE sc.semester_id = s.id
  AND sc.poster_date IS NULL;

-- ── JSONB scoring columns (idempotent) ───────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'semesters'
      AND column_name  = 'criteria_template'
  ) THEN
    ALTER TABLE public.semesters
      ADD COLUMN criteria_template JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'semesters'
      AND column_name  = 'mudek_template'
  ) THEN
    ALTER TABLE public.semesters
      ADD COLUMN mudek_template JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'scores'
      AND column_name  = 'criteria_scores'
  ) THEN
    ALTER TABLE public.scores
      ADD COLUMN criteria_scores JSONB;
  END IF;
END;
$$;

-- ── Constraints / indexes (idempotent) ───────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scores_unique_eval'
  ) THEN
    ALTER TABLE public.scores
      ADD CONSTRAINT scores_unique_eval
      UNIQUE (semester_id, project_id, juror_id);
  END IF;
END;
$$;

-- Legacy range constraints: only add when the column still exists.
-- Once Phase C drops the columns these blocks become no-ops.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scores_technical_range')
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'scores' AND column_name = 'technical'
     )
  THEN
    ALTER TABLE public.scores
      ADD CONSTRAINT scores_technical_range
        CHECK (technical IS NULL OR (technical >= 0 AND technical <= 30));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scores_written_range')
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'scores' AND column_name = 'written'
     )
  THEN
    ALTER TABLE public.scores
      ADD CONSTRAINT scores_written_range
        CHECK (written IS NULL OR (written >= 0 AND written <= 30));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scores_oral_range')
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'scores' AND column_name = 'oral'
     )
  THEN
    ALTER TABLE public.scores
      ADD CONSTRAINT scores_oral_range
        CHECK (oral IS NULL OR (oral >= 0 AND oral <= 30));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scores_teamwork_range')
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'scores' AND column_name = 'teamwork'
     )
  THEN
    ALTER TABLE public.scores
      ADD CONSTRAINT scores_teamwork_range
        CHECK (teamwork IS NULL OR (teamwork >= 0 AND teamwork <= 10));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scores_total_range'
  ) THEN
    ALTER TABLE public.scores
      ADD CONSTRAINT scores_total_range
        CHECK (total IS NULL OR (total >= 0 AND total <= 100));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'juror_semester_auth_unique'
  ) THEN
    ALTER TABLE public.juror_semester_auth
      ADD CONSTRAINT juror_semester_auth_unique
      UNIQUE (juror_id, semester_id);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS jurors_name_inst_norm_uniq
  ON public.jurors (
    lower(regexp_replace(trim(coalesce(juror_name, '')), '\\s+', ' ', 'g')),
    lower(regexp_replace(trim(coalesce(juror_inst, '')), '\\s+', ' ', 'g'))
  );

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_actor_action_idx
  ON public.audit_logs (actor_type, action, created_at DESC);

-- ── Views ───────────────────────────────────────────────────

DROP VIEW IF EXISTS public.v_active_scores;
CREATE VIEW public.v_active_scores AS
SELECT sc.id AS score_id,
       sem.id AS semester_id,
       sem.name AS semester_name,
       p.id AS project_id,
       p.group_no,
       p.project_title,
       p.group_students,
       j.id AS juror_id,
       j.juror_name,
       j.juror_inst,
       sc.criteria_scores,
       sc.total,
       sc.comment,
       sc.poster_date,
       sc.final_submitted_at,
       sc.created_at,
       sc.updated_at
FROM scores sc
JOIN semesters sem ON sem.id = sc.semester_id
JOIN projects p ON p.id = sc.project_id
JOIN jurors j ON j.id = sc.juror_id
WHERE sem.is_active = true;

-- ============================================================
-- One-time migration: convert fixed score columns to JSONB.
--
-- Phase A: populate criteria_template for existing semesters
--   Uses config.js id values as JSONB keys so the frontend
--   needs no field renaming after migration:
--     technical → "technical"
--     written   → "design"    (matches config.js id)
--     oral      → "delivery"  (matches config.js id)
--     teamwork  → "teamwork"
--
-- Phase B: migrate score rows to criteria_scores JSONB
--
-- Phase C (run SEPARATELY after live verification):
--   DROP legacy columns — see sql/003_drop_legacy_score_columns.sql
-- ============================================================

-- ── Phase A: Populate criteria_template for existing semesters ──

UPDATE public.semesters
SET criteria_template = '[
  {"key":"technical","label":"Technical Content","max":30},
  {"key":"design",   "label":"Written Communication","max":30},
  {"key":"delivery", "label":"Oral Communication","max":30},
  {"key":"teamwork", "label":"Teamwork","max":10}
]'::jsonb
WHERE criteria_template = '[]'::jsonb
   OR criteria_template IS NULL;

-- ── Phase B: Migrate score rows ──────────────────────────────
-- Only runs while the legacy columns still exist (no-op after Phase C).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scores' AND column_name = 'technical'
  ) THEN
    UPDATE public.scores
    SET criteria_scores = jsonb_strip_nulls(
      jsonb_build_object(
        'technical', technical,
        'design',    written,   -- written column → "design" key
        'delivery',  oral,      -- oral column    → "delivery" key
        'teamwork',  teamwork
      )
    )
    WHERE criteria_scores IS NULL
       OR criteria_scores = '{}'::jsonb;
  END IF;
END;
$$;

-- ── Phase C: Drop legacy columns ─────────────────────────────

ALTER TABLE public.scores
  DROP COLUMN IF EXISTS technical,
  DROP COLUMN IF EXISTS written,
  DROP COLUMN IF EXISTS oral,
  DROP COLUMN IF EXISTS teamwork;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scores_technical_range') THEN
    ALTER TABLE public.scores DROP CONSTRAINT scores_technical_range;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scores_written_range') THEN
    ALTER TABLE public.scores DROP CONSTRAINT scores_written_range;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scores_oral_range') THEN
    ALTER TABLE public.scores DROP CONSTRAINT scores_oral_range;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scores_teamwork_range') THEN
    ALTER TABLE public.scores DROP CONSTRAINT scores_teamwork_range;
  END IF;
END;
$$;
