-- =============================================================================
--  000_dev_teardown.sql — DEV-ONLY: Complete VERA database reset
-- =============================================================================
--
--  ██████╗  █████╗ ███╗   ██╗ ██████╗ ███████╗ ██████╗
--  ██╔══██╗██╔══██╗████╗  ██║██╔════╝ ██╔════╝ ██╔══██╗
--  ██║  ██║███████║██╔██╗ ██║██║  ███╗█████╗   ██████╔╝
--  ██║  ██║██╔══██║██║╚██╗██║██║   ██║██╔══╝   ██╔══██╗
--  ██████╔╝██║  ██║██║ ╚████║╚██████╔╝███████╗ ██║  ██║
--  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═╝  ╚═╝
--
--  !! NEVER RUN ON vera-prod OR ANY PRODUCTION-FACING PROJECT !!
--
--  This script drops ALL VERA tables, functions, and types. It is intended
--  solely for dev/demo environment resets — e.g., before applying 001 → 009
--  from scratch on a local or staging Supabase instance.
--
--  Dynamic approach: drops everything user-created in the public schema
--  (views, tables, functions, types) without maintaining an explicit list.
--  Extension-owned objects (uuid_generate_v4, gen_random_uuid, etc.) are
--  excluded via pg_depend.deptype = 'e'.
--
--  Safe to re-run: all DROP statements use IF EXISTS / exception handling.
--  After this, apply migrations in order: 001_extensions → 009_audit.
-- =============================================================================

BEGIN;

-- ============================================================
-- VIEWS
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT viewname FROM pg_views WHERE schemaname = 'public' LOOP
    EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
  END LOOP;
END $$;

-- ============================================================
-- TABLES
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- ============================================================
-- FUNCTIONS & PROCEDURES (user-defined only; extension-owned excluded)
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        JOIN pg_extension e ON e.oid = d.refobjid
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', r.proname, r.args);
  END LOOP;
END $$;

-- ============================================================
-- TYPES (enums, composites, domains; extension-owned excluded)
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype IN ('e', 'c', 'd')
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        JOIN pg_extension e ON e.oid = d.refobjid
        WHERE d.objid = t.oid AND d.deptype = 'e'
      )
  LOOP
    EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
  END LOOP;
END $$;

COMMIT;
