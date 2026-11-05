-- Keep public avatar reads, but bind writes to the authenticated user's tenant path.
DROP POLICY IF EXISTS "avatars_authenticated_insert" ON storage.objects;
CREATE POLICY "avatars_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = (SELECT private.current_tenant_id())::text
    AND split_part(name, '/', 2) = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "avatars_authenticated_update" ON storage.objects;
CREATE POLICY "avatars_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = (SELECT private.current_tenant_id())::text
    AND split_part(name, '/', 2) = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = (SELECT private.current_tenant_id())::text
    AND split_part(name, '/', 2) = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "avatars_authenticated_delete" ON storage.objects;
CREATE POLICY "avatars_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = (SELECT private.current_tenant_id())::text
    AND split_part(name, '/', 2) = (SELECT auth.uid())::text
  );

