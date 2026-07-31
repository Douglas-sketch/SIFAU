/*
# SIFAU — Storage bucket policies

Cria policies de Storage para o bucket público `occurrence-media`, permitindo
que usuários autenticados façam upload de mídia e que qualquer um leia (bucket
público — URLs são opacas/UUID, dados pessoais não são expostos no mapa público).
*/

-- Storage policies para occurrence-media (bucket já criado)
DROP POLICY IF EXISTS "media_read_public" ON storage.objects;
CREATE POLICY "media_read_public" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'occurrence-media');

DROP POLICY IF EXISTS "media_insert_authed" ON storage.objects;
CREATE POLICY "media_insert_authed" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'occurrence-media');

DROP POLICY IF EXISTS "media_update_owner" ON storage.objects;
CREATE POLICY "media_update_owner" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'occurrence-media' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'occurrence-media');

DROP POLICY IF EXISTS "media_delete_owner" ON storage.objects;
CREATE POLICY "media_delete_owner" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'occurrence-media' AND owner = auth.uid());
