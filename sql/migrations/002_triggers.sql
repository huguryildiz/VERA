-- ============================================================
-- 002_triggers.sql
-- Trigger functions and CREATE TRIGGER attachments.
-- Includes tenant-consistency enforcement triggers.
-- ============================================================

-- ── Shared updated_at trigger ──────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

CREATE TRIGGER trg_semesters_updated_at
  BEFORE UPDATE ON public.semesters
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

CREATE TRIGGER trg_jurors_updated_at
  BEFORE UPDATE ON public.jurors
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

CREATE TRIGGER trg_memberships_updated_at
  BEFORE UPDATE ON public.tenant_admin_memberships
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.tenant_admin_applications
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- ── Tenant code immutability ───────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_tenants_immutable_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.code IS DISTINCT FROM NEW.code THEN
    RAISE EXCEPTION 'tenant_code_immutable'
      USING HINT = 'Tenant code cannot be changed after creation.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_immutable_code
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.trg_tenants_immutable_code();

-- ── Score total computation ────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_scores_compute_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_total numeric := 0;
  v_key   text;
  v_val   text;
BEGIN
  IF NEW.criteria_scores IS NULL
     OR NEW.criteria_scores = '{}'::jsonb THEN
    NEW.total := NULL;
    RETURN NEW;
  END IF;

  FOR v_key, v_val IN SELECT * FROM jsonb_each_text(NEW.criteria_scores) LOOP
    IF v_val IS NULL THEN
      NEW.total := NULL;
      RETURN NEW;
    END IF;
    v_total := v_total + (v_val::numeric);
  END LOOP;

  NEW.total := v_total::integer;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scores_total
  BEFORE INSERT OR UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.trg_scores_compute_total();

-- ── Score poster_date backfill ─────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_scores_set_poster_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT poster_date INTO NEW.poster_date
  FROM semesters
  WHERE id = NEW.semester_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scores_poster_date
  BEFORE INSERT OR UPDATE OF semester_id ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.trg_scores_set_poster_date();

-- ── Score updated_at (content-only) ────────────────────────

CREATE OR REPLACE FUNCTION public.trg_scores_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF  NEW.criteria_scores IS DISTINCT FROM OLD.criteria_scores
   OR NEW.comment         IS DISTINCT FROM OLD.comment
  THEN
    NEW.updated_at := now();
  ELSE
    NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scores_updated_at
  BEFORE UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.trg_scores_set_updated_at();

-- ── Audit log immutability ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_audit_logs_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs_immutable';
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logs_immutable();

-- ── Admin profiles updated_at ──────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_admin_profiles_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_admin_profiles_set_updated_at();

-- ── Tenant consistency: projects ───────────────────────────

CREATE OR REPLACE FUNCTION public.trg_projects_enforce_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_semester_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_semester_tenant
  FROM semesters WHERE id = NEW.semester_id;

  IF v_semester_tenant IS NULL THEN
    RAISE EXCEPTION 'project_semester_not_found'
      USING HINT = 'Semester does not exist.';
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM v_semester_tenant THEN
    RAISE EXCEPTION 'project_tenant_mismatch'
      USING HINT = 'Project tenant_id must match its semester tenant_id.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_projects_enforce_tenant
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.trg_projects_enforce_tenant();

-- ── Tenant consistency: scores ─────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_scores_enforce_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_semester_tenant uuid;
  v_project_tenant  uuid;
BEGIN
  SELECT tenant_id INTO v_semester_tenant
  FROM semesters WHERE id = NEW.semester_id;

  IF v_semester_tenant IS NULL THEN
    RAISE EXCEPTION 'score_semester_not_found';
  END IF;

  SELECT tenant_id INTO v_project_tenant
  FROM projects WHERE id = NEW.project_id;

  IF v_project_tenant IS NULL THEN
    RAISE EXCEPTION 'score_project_not_found';
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM v_semester_tenant THEN
    RAISE EXCEPTION 'score_tenant_mismatch_semester'
      USING HINT = 'Score tenant_id must match its semester tenant_id.';
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM v_project_tenant THEN
    RAISE EXCEPTION 'score_tenant_mismatch_project'
      USING HINT = 'Score tenant_id must match its project tenant_id.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scores_enforce_tenant
  BEFORE INSERT OR UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.trg_scores_enforce_tenant();

-- ── Tenant consistency: juror_semester_auth ─────────────────

CREATE OR REPLACE FUNCTION public.trg_jsa_enforce_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_semester_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_semester_tenant
  FROM semesters WHERE id = NEW.semester_id;

  IF v_semester_tenant IS NULL THEN
    RAISE EXCEPTION 'jsa_semester_not_found';
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM v_semester_tenant THEN
    RAISE EXCEPTION 'jsa_tenant_mismatch'
      USING HINT = 'Juror auth tenant_id must match its semester tenant_id.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_jsa_enforce_tenant
  BEFORE INSERT OR UPDATE ON public.juror_semester_auth
  FOR EACH ROW EXECUTE FUNCTION public.trg_jsa_enforce_tenant();
