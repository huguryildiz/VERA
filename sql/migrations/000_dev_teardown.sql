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
--  Safe to re-run: all statements use IF EXISTS.
--  After this, apply migrations in order: 001_extensions → 009_audit.
-- =============================================================================

BEGIN;

-- ============================================================
-- VIEWS
-- ============================================================
DROP VIEW IF EXISTS scores_compat CASCADE;

-- ============================================================
-- TABLES (dependency order: children before parents)
-- ============================================================

-- Audit
DROP TABLE IF EXISTS audit_logs                      CASCADE;

-- Feedback
DROP TABLE IF EXISTS jury_feedback                   CASCADE;

-- Config
DROP TABLE IF EXISTS security_policy                 CASCADE;
DROP TABLE IF EXISTS maintenance_mode                CASCADE;
DROP TABLE IF EXISTS platform_settings               CASCADE;

-- Backups
DROP TABLE IF EXISTS platform_backups                CASCADE;

-- Identity / Invites
DROP TABLE IF EXISTS admin_invites                   CASCADE;
DROP TABLE IF EXISTS admin_user_sessions             CASCADE;

-- Scoring
DROP TABLE IF EXISTS score_sheet_items               CASCADE;
DROP TABLE IF EXISTS score_sheets                    CASCADE;

-- Snapshot
DROP TABLE IF EXISTS period_criterion_outcome_maps   CASCADE;
DROP TABLE IF EXISTS period_outcomes                 CASCADE;
DROP TABLE IF EXISTS period_criteria                 CASCADE;

-- Execution
DROP TABLE IF EXISTS entry_tokens                    CASCADE;
DROP TABLE IF EXISTS juror_period_auth               CASCADE;
DROP TABLE IF EXISTS jurors                          CASCADE;
DROP TABLE IF EXISTS projects                        CASCADE;
DROP TABLE IF EXISTS periods                         CASCADE;

-- Framework
DROP TABLE IF EXISTS framework_criterion_outcome_maps CASCADE;
DROP TABLE IF EXISTS framework_criteria               CASCADE;
DROP TABLE IF EXISTS framework_outcomes               CASCADE;
DROP TABLE IF EXISTS frameworks                       CASCADE;

-- v0 legacy names (safe no-ops on fresh DB)
DROP TABLE IF EXISTS criterion_outcome_mappings       CASCADE;
DROP TABLE IF EXISTS outcomes                         CASCADE;
DROP TABLE IF EXISTS tenant_applications              CASCADE;

-- Identity
DROP TABLE IF EXISTS org_applications                CASCADE;
DROP TABLE IF EXISTS memberships                     CASCADE;
DROP TABLE IF EXISTS profiles                        CASCADE;
DROP TABLE IF EXISTS organizations                   CASCADE;

-- ============================================================
-- FUNCTIONS — Jury RPCs
-- ============================================================
DROP FUNCTION IF EXISTS public.rpc_jury_authenticate(UUID, TEXT, TEXT, BOOLEAN, TEXT)       CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_authenticate(UUID, TEXT, TEXT, BOOLEAN)             CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_verify_pin(UUID, TEXT, TEXT, TEXT)                  CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_validate_entry_token(TEXT)                          CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_validate_entry_reference(TEXT)                      CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_upsert_score(UUID, UUID, UUID, TEXT, JSONB, TEXT)   CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_finalize_submission(UUID, UUID, TEXT)               CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_get_scores(UUID, UUID, TEXT)                        CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_project_rankings(UUID, TEXT)                        CASCADE;
DROP FUNCTION IF EXISTS public.rpc_get_period_impact(UUID, TEXT)                            CASCADE;
DROP FUNCTION IF EXISTS public.rpc_submit_jury_feedback(UUID, TEXT, SMALLINT, TEXT)         CASCADE;
DROP FUNCTION IF EXISTS public.rpc_get_public_feedback()                                    CASCADE;
DROP FUNCTION IF EXISTS public.rpc_jury_upsert_scores(UUID, UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) CASCADE;

-- ============================================================
-- FUNCTIONS — Admin Auth / Identity
-- ============================================================
DROP FUNCTION IF EXISTS public.rpc_admin_invite_send(UUID, TEXT)                            CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_invite_list(UUID)                                  CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_invite_resend(UUID)                                CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_invite_cancel(UUID)                                CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_invite_get_payload(UUID)                           CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_invite_mark_accepted(UUID, UUID)                   CASCADE;
DROP FUNCTION IF EXISTS public.rpc_accept_invite(TEXT, TEXT, TEXT, TEXT)                    CASCADE;
DROP FUNCTION IF EXISTS public.rpc_org_admin_cancel_invite(UUID)                            CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_find_user_by_email(TEXT)                           CASCADE;

-- ============================================================
-- FUNCTIONS — Admin Tenant / Org
-- ============================================================
DROP FUNCTION IF EXISTS public.rpc_admin_approve_application(UUID)                          CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_list_organizations()                               CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_update_organization(UUID, JSONB)                   CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_update_member_profile(UUID, TEXT, UUID)            CASCADE;

-- ============================================================
-- FUNCTIONS — Admin Entry Tokens / Period
-- ============================================================
DROP FUNCTION IF EXISTS public.rpc_admin_generate_entry_token(UUID)                         CASCADE;
DROP FUNCTION IF EXISTS public.rpc_entry_token_generate(UUID)                               CASCADE;
DROP FUNCTION IF EXISTS public.rpc_entry_token_revoke(UUID)                                 CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_revoke_entry_token(UUID)                           CASCADE;
DROP FUNCTION IF EXISTS public.rpc_period_freeze_snapshot(UUID)                             CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_set_current_period(UUID)                           CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_set_period_lock(UUID, BOOLEAN)                     CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_save_period_criteria(UUID, JSONB)                  CASCADE;

-- ============================================================
-- FUNCTIONS — Admin Juror Management
-- ============================================================
DROP FUNCTION IF EXISTS public.rpc_juror_reset_pin(UUID, UUID)                             CASCADE;
DROP FUNCTION IF EXISTS public.rpc_juror_toggle_edit_mode(UUID, UUID, BOOLEAN, TEXT, INT)   CASCADE;
DROP FUNCTION IF EXISTS public.rpc_juror_unlock_pin(UUID, UUID)                            CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_force_close_juror_edit_mode(UUID, UUID)            CASCADE;

-- ============================================================
-- FUNCTIONS — Admin Framework
-- ============================================================
DROP FUNCTION IF EXISTS public.rpc_admin_create_framework_outcome(UUID, TEXT, TEXT, TEXT, INT) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_update_framework_outcome(UUID, JSONB)              CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_delete_framework_outcome(UUID)                     CASCADE;

-- ============================================================
-- FUNCTIONS — Admin Security / Policy
-- ============================================================
DROP FUNCTION IF EXISTS public.rpc_admin_get_security_policy()                              CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_set_security_policy(JSONB)                         CASCADE;
DROP FUNCTION IF EXISTS public.rpc_public_auth_flags()                                      CASCADE;

-- ============================================================
-- FUNCTIONS — Platform Settings / Maintenance
-- ============================================================
DROP FUNCTION IF EXISTS public.rpc_admin_get_platform_settings()                            CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_set_platform_settings(TEXT, TEXT, BOOLEAN)         CASCADE;
DROP FUNCTION IF EXISTS public.rpc_public_platform_settings()                               CASCADE;
DROP FUNCTION IF EXISTS public.rpc_public_maintenance_status()                              CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_get_maintenance()                                  CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_set_maintenance(TEXT, TIMESTAMPTZ, INT, TEXT, UUID[], BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_cancel_maintenance()                               CASCADE;
DROP FUNCTION IF EXISTS public.rpc_platform_metrics()                                       CASCADE;

-- ============================================================
-- FUNCTIONS — Platform Backups
-- ============================================================
DROP FUNCTION IF EXISTS public.rpc_backup_list(UUID)                                        CASCADE;
DROP FUNCTION IF EXISTS public.rpc_backup_register(UUID, TEXT, BIGINT, TEXT, JSONB, UUID[], TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_backup_delete(UUID)                                      CASCADE;
DROP FUNCTION IF EXISTS public.rpc_backup_record_download(UUID)                             CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_get_backup_schedule()                              CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_set_backup_schedule(TEXT)                          CASCADE;

-- ============================================================
-- FUNCTIONS — Audit (RPCs + Helpers)
-- ============================================================
DROP FUNCTION IF EXISTS public.rpc_admin_write_audit_log(TEXT, TEXT, UUID, JSONB)           CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_write_audit_event(JSONB)                           CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_log_period_lock(UUID, TEXT, JSONB)                 CASCADE;
DROP FUNCTION IF EXISTS public.rpc_write_auth_failure_event(TEXT, TEXT)                     CASCADE;
DROP FUNCTION IF EXISTS public.rpc_admin_verify_audit_chain(UUID)                           CASCADE;
DROP FUNCTION IF EXISTS public._audit_write(UUID, TEXT, TEXT, UUID, audit_category, audit_severity, JSONB, JSONB, audit_actor_type) CASCADE;
DROP FUNCTION IF EXISTS public._audit_verify_chain_internal(UUID)                           CASCADE;

-- ============================================================
-- FUNCTIONS — Public / Stats
-- ============================================================
DROP FUNCTION IF EXISTS public.rpc_landing_stats()                                          CASCADE;
DROP FUNCTION IF EXISTS public.rpc_check_email_available(TEXT)                              CASCADE;

-- ============================================================
-- FUNCTIONS — Helpers, Triggers
-- ============================================================
DROP FUNCTION IF EXISTS public._assert_super_admin()                                        CASCADE;
DROP FUNCTION IF EXISTS public._assert_org_admin(UUID)                                      CASCADE;
DROP FUNCTION IF EXISTS public.current_user_is_super_admin()                                CASCADE;
DROP FUNCTION IF EXISTS public.trigger_set_updated_at()                                     CASCADE;
DROP FUNCTION IF EXISTS public.trigger_audit_log()                                          CASCADE;
DROP FUNCTION IF EXISTS public.audit_logs_compute_hash()                                    CASCADE;
DROP FUNCTION IF EXISTS public.handle_invite_confirmed()                                    CASCADE;

-- ============================================================
-- TYPES (drop after functions that reference them)
-- ============================================================
DROP TYPE IF EXISTS public.audit_category  CASCADE;
DROP TYPE IF EXISTS public.audit_severity  CASCADE;
DROP TYPE IF EXISTS public.audit_actor_type CASCADE;

COMMIT;
