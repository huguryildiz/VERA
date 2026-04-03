-- VERA v1 — scores_compat VIEW update
-- Adds juror session state columns (final_submitted_at, edit_enabled)
-- and score sheet status (sheet_status) to the scores_compat view.
-- This allows getScores() to return juror workflow status in a single query
-- without a separate listJurorsSummary() call.

CREATE OR REPLACE VIEW scores_compat AS
SELECT
  ss.id,
  ss.juror_id,
  ss.project_id,
  ss.period_id,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'technical') AS technical,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'design')    AS written,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'delivery')  AS oral,
  MAX(ssi.score_value) FILTER (WHERE pc.key = 'teamwork')  AS teamwork,
  ss.comment    AS comments,
  ss.status     AS sheet_status,
  ss.created_at,
  ss.updated_at,
  -- Juror session state from juror_period_auth (unique per juror+period)
  jpa.final_submitted_at,
  jpa.edit_enabled
FROM score_sheets ss
LEFT JOIN score_sheet_items  ssi ON ssi.score_sheet_id = ss.id
LEFT JOIN period_criteria    pc  ON pc.id = ssi.period_criterion_id
LEFT JOIN juror_period_auth  jpa ON jpa.juror_id = ss.juror_id
                                AND jpa.period_id = ss.period_id
GROUP BY ss.id, jpa.final_submitted_at, jpa.edit_enabled;
