-- Migration: 009_fix_storage_bucket_id
-- Fixes existing deployments where bucket was created with UUID ID instead of name
-- Run this if uploads fail with "Bucket not found" or storage errors

DO $$
DECLARE
  old_bucket RECORD;
BEGIN
  -- Find any bucket named 'bdja-uploads' with a non-matching ID
  SELECT * INTO old_bucket FROM storage.buckets WHERE name = 'bdja-uploads' LIMIT 1;

  IF FOUND AND old_bucket.id != 'bdja-uploads' THEN
    -- Delete the old bucket (objects will be orphaned — acceptable for a fresh fix)
    DELETE FROM storage.buckets WHERE id = old_bucket.id;
    RAISE NOTICE 'Deleted old bucket with ID %', old_bucket.id;
  END IF;

  -- Insert the bucket with correct ID = name
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'bdja-uploads',
    'bdja-uploads',
    true,
    10485760,
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

  RAISE NOTICE 'Bucket bdja-uploads ensured with ID = name';
END $$;

-- Re-create policies to ensure they reference the correct bucket_id
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated uploads to bdja-uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated select on bdja-uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read on bdja-uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated delete own on bdja-uploads" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  -- Ignore
END $$;

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
