
CREATE POLICY "msg attach read auth" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'message-attachments');
CREATE POLICY "msg attach write own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'message-attachments' AND owner = auth.uid());
CREATE POLICY "msg attach delete own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'message-attachments' AND owner = auth.uid());
