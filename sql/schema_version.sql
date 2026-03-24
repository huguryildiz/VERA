-- sql/schema_version.sql
-- Schema version tracking for the migration system.

CREATE TABLE IF NOT EXISTS public.schema_version (
  version     integer PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL DEFAULT ''
);

-- Record that the initial schema (split from 000_bootstrap.sql) has been applied.
INSERT INTO public.schema_version (version, description)
VALUES (1, 'Initial schema — split from 000_bootstrap.sql')
ON CONFLICT (version) DO NOTHING;
