-- ============================================================
-- 002_triggers.sql
-- Trigger functions and trigger bindings.
-- Extracted from 000_bootstrap.sql (move-only refactor).
-- ============================================================

-- ── Triggers ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_semesters_updated_at ON public.semesters;
CREATE TRIGGER trg_semesters_updated_at
  BEFORE UPDATE ON public.semesters
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_jurors_updated_at ON public.jurors;
CREATE TRIGGER trg_jurors_updated_at
  BEFORE UPDATE ON public.jurors
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

CREATE OR REPLACE FUNCTION public.trg_scores_compute_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_total numeric := 0;
  v_key   text;
  v_val   text;
BEGIN
  -- Dynamic JSONB sum: compute total from criteria_scores.
  -- NULL or empty criteria_scores → NULL total (partial/unsaved state).
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

DROP TRIGGER IF EXISTS trg_scores_total ON public.scores;
CREATE TRIGGER trg_scores_total
  BEFORE INSERT OR UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.trg_scores_compute_total();

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

DROP TRIGGER IF EXISTS trg_scores_poster_date ON public.scores;
CREATE TRIGGER trg_scores_poster_date
  BEFORE INSERT OR UPDATE OF semester_id ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.trg_scores_set_poster_date();

-- updated_at should change ONLY when score content changes
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

DROP TRIGGER IF EXISTS trg_scores_updated_at ON public.scores;
CREATE TRIGGER trg_scores_updated_at
  BEFORE UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.trg_scores_set_updated_at();

-- audit logs should never be updated or deleted
CREATE OR REPLACE FUNCTION public.trg_audit_logs_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs_immutable';
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logs_immutable();
