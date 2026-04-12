-- 036_platform_backups_rpcs.sql
-- RPCs for platform_backups: list, register, delete, record_download.
-- All are SECURITY DEFINER and assert that the caller is an admin of
-- the affected organization via _assert_org_admin().

-- ── List backups for an organization ────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_backup_list(
  p_organization_id UUID
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  origin TEXT,
  format TEXT,
  storage_path TEXT,
  size_bytes BIGINT,
  row_counts JSONB,
  period_ids UUID[],
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  download_count INT,
  last_downloaded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public._assert_org_admin(p_organization_id);

  RETURN QUERY
  SELECT
    b.id,
    b.organization_id,
    b.origin,
    b.format,
    b.storage_path,
    b.size_bytes,
    b.row_counts,
    b.period_ids,
    b.created_by,
    COALESCE(p.display_name, 'System') AS created_by_name,
    b.created_at,
    b.expires_at,
    b.download_count,
    b.last_downloaded_at
  FROM public.platform_backups b
  LEFT JOIN public.profiles p ON p.id = b.created_by
  WHERE b.organization_id = p_organization_id
  ORDER BY b.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_backup_list(UUID) TO authenticated;

-- ── Register a new backup row (called after Storage upload) ─────
CREATE OR REPLACE FUNCTION public.rpc_backup_register(
  p_organization_id UUID,
  p_storage_path    TEXT,
  p_size_bytes      BIGINT,
  p_format          TEXT,
  p_row_counts      JSONB,
  p_period_ids      UUID[],
  p_origin          TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id UUID;
  v_retention_days INT := 90;
  v_expires_at TIMESTAMPTZ;
BEGIN
  PERFORM public._assert_org_admin(p_organization_id);

  IF p_origin NOT IN ('manual', 'auto', 'snapshot') THEN
    RAISE EXCEPTION 'invalid origin: %', p_origin;
  END IF;

  IF p_format NOT IN ('json', 'xlsx') THEN
    RAISE EXCEPTION 'invalid format: %', p_format;
  END IF;

  -- Snapshot backups are pinned (never expire)
  IF p_origin = 'snapshot' THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at := now() + (v_retention_days || ' days')::interval;
  END IF;

  INSERT INTO public.platform_backups (
    organization_id, origin, format, storage_path, size_bytes,
    row_counts, period_ids, created_by, expires_at
  )
  VALUES (
    p_organization_id, p_origin, p_format, p_storage_path, p_size_bytes,
    p_row_counts, p_period_ids, auth.uid(), v_expires_at
  )
  RETURNING id INTO v_id;

  -- Audit
  PERFORM public.rpc_admin_write_audit_log(
    'backup.created',
    'platform_backups',
    v_id,
    jsonb_build_object(
      'origin', p_origin,
      'format', p_format,
      'size_bytes', p_size_bytes,
      'row_counts', p_row_counts
    ),
    p_organization_id
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_backup_register(UUID, TEXT, BIGINT, TEXT, JSONB, UUID[], TEXT) TO authenticated;

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

  PERFORM public._assert_tenant_admin(v_org_id);

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

  PERFORM public._assert_tenant_admin(v_org_id);

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
