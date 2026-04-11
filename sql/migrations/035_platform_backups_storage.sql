-- 035_platform_backups_storage.sql
-- Creates the 'backups' Storage bucket and RLS policies on storage.objects
-- so org admins can read / write / delete files only within their own
-- org's folder. Files are organized as: backups/<organization_id>/<backup_id>.<format>

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backups',
  'backups',
  false,
  52428800, -- 50 MB per file
  ARRAY['application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- Helper: extract org_id from the object's folder path.
-- Objects look like: <org_id>/<backup_id>.json
-- storage.foldername(name) returns an array of path segments.

-- SELECT: allow read if the first folder segment matches the caller's org
CREATE POLICY "backups_select_own_org"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'backups'
    AND (
      CASE
        WHEN cardinality(storage.foldername(name)) > 0 THEN
          (storage.foldername(name))[1]::uuid IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND organization_id IS NOT NULL
          )
        ELSE FALSE
      END
    )
  );

-- INSERT: allow write if the caller is an org admin for that folder
CREATE POLICY "backups_insert_own_org"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'backups'
    AND (
      CASE
        WHEN cardinality(storage.foldername(name)) > 0 THEN
          (storage.foldername(name))[1]::uuid IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND organization_id IS NOT NULL
          )
        ELSE FALSE
      END
    )
  );

-- DELETE: same check
CREATE POLICY "backups_delete_own_org"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'backups'
    AND (
      CASE
        WHEN cardinality(storage.foldername(name)) > 0 THEN
          (storage.foldername(name))[1]::uuid IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND organization_id IS NOT NULL
          )
        ELSE FALSE
      END
    )
  );
