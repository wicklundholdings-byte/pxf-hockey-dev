
CREATE POLICY "ice_contracts_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ice-contracts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ice_contracts_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ice-contracts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ice_contracts_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ice-contracts' AND auth.uid()::text = (storage.foldername(name))[1]);
