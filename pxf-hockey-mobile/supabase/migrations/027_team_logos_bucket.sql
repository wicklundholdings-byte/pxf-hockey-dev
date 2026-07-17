-- Migration 027: team-logos storage bucket
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Create the public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Coaches can upload logos (any authenticated user can insert)
CREATE POLICY "Coaches can upload team logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'team-logos');

-- 3. Coaches can replace/update their own logos (folder must match their uid)
CREATE POLICY "Coaches can update their team logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'team-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Anyone can read logos (public bucket)
CREATE POLICY "Public read team logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'team-logos');

-- 5. Coaches can delete their own logos
CREATE POLICY "Coaches can delete their team logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'team-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
