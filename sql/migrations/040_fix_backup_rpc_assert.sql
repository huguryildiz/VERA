-- 040_fix_backup_rpc_assert.sql
-- Fix rpc_backup_delete and rpc_backup_record_download: both incorrectly called
-- _assert_tenant_admin() (which does not exist) instead of _assert_org_admin().

-- ── Delete a backup row ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_backup_delete(
  p_backup_id UUID
)
RETURNS TABLE (storage_path TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id UUID;
  v_path TEXT;
  v_origin TEXT;
BEGIN
  SELECT b.organization_id, b.storage_path, b.origin
    INTO v_org_id, v_path, v_origin
    FROM public.platform_backups b
    WHERE b.id = p_backup_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'backup not found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  IF v_origin = 'snapshot' THEN
    RAISE EXCEPTION 'snapshot backups are pinned and cannot be deleted';
  END IF;

  DELETE FROM public.platform_backups WHERE id = p_backup_id;

  PERFORM public.rpc_admin_write_audit_log(
    'backup.deleted',
    'platform_backups',
    p_backup_id,
    jsonb_build_object('storage_path', v_path, 'origin', v_origin),
    v_org_id
  );

  RETURN QUERY SELECT v_path;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_backup_delete(UUID) TO authenticated;

-- ── Record a download event ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_backup_record_download(
  p_backup_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
    FROM public.platform_backups WHERE id = p_backup_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'backup not found';
  END IF;

  PERFORM public._assert_org_admin(v_org_id);

  UPDATE public.platform_backups
    SET download_count = download_count + 1,
        last_downloaded_at = now()
    WHERE id = p_backup_id;

  PERFORM public.rpc_admin_write_audit_log(
    'backup.downloaded',
    'platform_backups',
    p_backup_id,
    '{}'::jsonb,
    v_org_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_backup_record_download(UUID) TO authenticated;
