-- VERA v1 — Supabase Realtime Publication
-- Depends on: 002_tables.sql (tables must exist before being added to publication)
--
-- Only tables that need live updates are included to minimise WAL overhead.
-- RLS still applies to all realtime subscriptions.

ALTER PUBLICATION supabase_realtime ADD TABLE
  score_sheets,
  score_sheet_items,
  juror_period_auth,
  projects,
  periods,
  jurors,
  audit_logs;
