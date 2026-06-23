
CREATE POLICY "Users upload own medical docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'medical-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own medical docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'medical-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own medical docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'medical-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Coaches read medical docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'medical-docs' AND public.has_role(auth.uid(), 'admin'::app_role));
