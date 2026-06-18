
-- Allow any authenticated user to read media (signed URLs)
CREATE POLICY "Authenticated read media buckets" ON storage.objects FOR SELECT
TO authenticated USING (
  bucket_id IN ('drill-videos','drill-thumbnails','category-images','program-images')
);

-- Anon read for thumbnails/category/program images (for landing previews); not for videos
CREATE POLICY "Anon read public images" ON storage.objects FOR SELECT
TO anon USING (
  bucket_id IN ('drill-thumbnails','category-images','program-images')
);

-- Admin write/update/delete
CREATE POLICY "Admins upload media" ON storage.objects FOR INSERT
TO authenticated WITH CHECK (
  bucket_id IN ('drill-videos','drill-thumbnails','category-images','program-images')
  AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins update media" ON storage.objects FOR UPDATE
TO authenticated USING (
  bucket_id IN ('drill-videos','drill-thumbnails','category-images','program-images')
  AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins delete media" ON storage.objects FOR DELETE
TO authenticated USING (
  bucket_id IN ('drill-videos','drill-thumbnails','category-images','program-images')
  AND public.has_role(auth.uid(), 'admin')
);
