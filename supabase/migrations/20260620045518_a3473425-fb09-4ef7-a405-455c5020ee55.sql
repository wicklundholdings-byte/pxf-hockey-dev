
CREATE POLICY "camp-images authenticated read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'camp-images');
CREATE POLICY "camp-images anon read" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'camp-images');
CREATE POLICY "camp-images owners upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'camp-images' AND owner = auth.uid());
CREATE POLICY "camp-images owners update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'camp-images' AND owner = auth.uid());
CREATE POLICY "camp-images owners delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'camp-images' AND owner = auth.uid());
