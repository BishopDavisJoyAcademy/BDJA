-- Migration: 006_storage_bucket
-- Creates the bdja-uploads storage bucket for avatar uploads and file attachments
-- FIXED: Uses 'bdja-uploads' as the bucket ID (not a random UUID) so policies work correctly

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bdja-uploads',
  'bdja-uploads',
  true,
  10485760,  -- 10 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing conflicting policies (idempotent)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated uploads to bdja-uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated select on bdja-uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read on bdja-uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated delete own on bdja-uploads" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  -- Policies may not exist, ignore
END $$;

-- 4. Create policies for bdja-uploads bucket
-- bucket_id references storage.buckets.id, which is now 'bdja-uploads'
CREATE POLICY "Allow authenticated uploads to bdja-uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bdja-uploads');

CREATE POLICY "Allow authenticated select on bdja-uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'bdja-uploads');

CREATE POLICY "Allow public read on bdja-uploads"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'bdja-uploads');

CREATE POLICY "Allow authenticated delete own on bdja-uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bdja-uploads'
  AND owner = auth.uid()
);

-- 5. Verify
SELECT name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name = 'bdja-uploads';
