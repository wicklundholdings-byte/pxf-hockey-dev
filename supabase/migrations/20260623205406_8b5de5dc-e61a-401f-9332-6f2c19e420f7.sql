
CREATE POLICY "Coach uploads game media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'game-media'
  AND public.is_team_coach((storage.foldername(name))[1]::uuid)
  AND owner = auth.uid()
);

CREATE POLICY "Coach updates game media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'game-media' AND public.is_team_coach((storage.foldername(name))[1]::uuid));

CREATE POLICY "Coach deletes game media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'game-media' AND public.is_team_coach((storage.foldername(name))[1]::uuid));

CREATE POLICY "Team members view game media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'game-media'
  AND (
    public.is_team_coach((storage.foldername(name))[1]::uuid)
    OR public.is_team_parent((storage.foldername(name))[1]::uuid)
  )
);
