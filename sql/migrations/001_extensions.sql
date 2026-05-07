-- VERA v1 — Required PostgreSQL extensions + Realtime publication
-- Run first, before any other migrations.

-- Extensions schema: pgcrypto functions (digest, gen_salt, crypt) live here.
-- All SECURITY DEFINER RPCs include "extensions" in their search_path.
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp"  SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"   SCHEMA extensions;

-- pgTAP: SQL-level unit tests (RLS, RPC behavior) live in sql/tests/.
-- Loaded into its own schema to avoid name collisions with public.
-- Tests run under the `authenticated` role after SET LOCAL role authenticated,
-- so that role needs USAGE + EXECUTE on the tap schema to resolve tap.is() etc.
CREATE SCHEMA IF NOT EXISTS tap;
CREATE EXTENSION IF NOT EXISTS "pgtap"      SCHEMA tap;
GRANT USAGE ON SCHEMA tap TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tap TO authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA tap GRANT EXECUTE ON FUNCTIONS TO authenticated, anon;

