-- 034_platform_backups.sql
-- Creates the platform_backups table that tracks metadata for
-- backup files stored in the 'backups' Storage bucket.

CREATE TABLE IF NOT EXISTS public.platform_backups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  origin            TEXT NOT NULL CHECK (origin IN ('manual', 'auto', 'snapshot')),
  format            TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'xlsx')),
  storage_path      TEXT NOT NULL,
  size_bytes        BIGINT NOT NULL DEFAULT 0,
  row_counts        JSONB NOT NULL DEFAULT '{}'::jsonb,
  period_ids        UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ,
  download_count    INT NOT NULL DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_platform_backups_org_created
  ON public.platform_backups (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_backups_storage_path
  ON public.platform_backups (storage_path);

ALTER TABLE public.platform_backups ENABLE ROW LEVEL SECURITY;

-- Org admins can SELECT their org's backups
CREATE POLICY "platform_backups_select_org_admin"
  ON public.platform_backups FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND organization_id IS NOT NULL
    )
  );

-- INSERT / UPDATE / DELETE go through SECURITY DEFINER RPCs only.
-- No direct policies granted — RPCs use the table with definer rights.
