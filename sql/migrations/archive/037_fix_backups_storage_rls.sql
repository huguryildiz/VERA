-- 037_fix_backups_storage_rls.sql
-- Fix backups storage RLS policies to also allow super-admins
-- (memberships.organization_id IS NULL) who were previously rejected.
-- The original policies only checked for org-scoped memberships, excluding
-- super-admins whose membership row has organization_id = NULL.

-- ── Drop old policies ────────────────────────────────────────────
DROP POLICY IF EXISTS "backups_select_own_org" ON storage.objects;
DROP POLICY IF EXISTS "backups_insert_own_org" ON storage.objects;
DROP POLICY IF EXISTS "backups_delete_own_org" ON storage.objects;

-- ── Helper expression ─────────────────────────────────────────────
-- Used in all three policies:
--   1. Caller is a super-admin (organization_id IS NULL in memberships)
--   2. Caller is a member of the org whose ID is the first path segment

-- SELECT
CREATE POLICY "backups_select_own_org"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'backups'
    AND (
      -- super-admin
      EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = auth.uid() AND organization_id IS NULL
      )
      OR
      -- org admin / member
      (
        cardinality(storage.foldername(name)) > 0
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT organization_id FROM public.memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
      )
    )
  );

-- INSERT
CREATE POLICY "backups_insert_own_org"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'backups'
    AND (
      EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = auth.uid() AND organization_id IS NULL
      )
      OR
      (
        cardinality(storage.foldername(name)) > 0
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT organization_id FROM public.memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
      )
    )
  );

-- DELETE
CREATE POLICY "backups_delete_own_org"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'backups'
    AND (
      EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = auth.uid() AND organization_id IS NULL
      )
      OR
      (
        cardinality(storage.foldername(name)) > 0
        AND (storage.foldername(name))[1]::uuid IN (
          SELECT organization_id FROM public.memberships
          WHERE user_id = auth.uid() AND organization_id IS NOT NULL
        )
      )
    )
  );
