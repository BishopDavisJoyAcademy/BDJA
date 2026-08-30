-- BDJA Upload Diagnostic Script
-- Run this in Supabase SQL Editor to verify storage is properly configured

-- 1. Check if bdja-uploads bucket exists
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name = 'bdja-uploads';

-- 2. Check all buckets
SELECT id, name, public, file_size_limit
FROM storage.buckets
ORDER BY name;

-- 3. Check storage policies for bdja-uploads
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
AND (policyname LIKE '%bdja-uploads%' OR policyname LIKE '%upload%');

-- 4. If bucket is missing, run this to create it:
/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  gen_random_uuid(),
  'bdja-uploads',
  true,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated uploads to bdja-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select on bdja-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on bdja-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete own on bdja-uploads" ON storage.objects;

CREATE POLICY "Allow authenticated uploads to bdja-uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bdja-uploads');

CREATE POLICY "Allow authenticated select on bdja-uploads"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'bdja-uploads');

CREATE POLICY "Allow public read on bdja-uploads"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'bdja-uploads');

CREATE POLICY "Allow authenticated delete own on bdja-uploads"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'bdja-uploads' AND owner = auth.uid());
*/
