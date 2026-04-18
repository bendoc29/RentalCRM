-- Migration: Create Supabase Storage bucket for conversation import screenshots
-- Apply via Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-imports',
  'conversation-imports',
  false,
  10485760, -- 10 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Authenticated users can upload conversation screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'conversation-imports');

-- Allow authenticated users to read files
CREATE POLICY IF NOT EXISTS "Authenticated users can read conversation screenshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'conversation-imports');

-- Allow authenticated users to delete their own files
CREATE POLICY IF NOT EXISTS "Authenticated users can delete conversation screenshots"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'conversation-imports');
