-- ============================================================
-- Lovcore Storage Setup
-- Run in Supabase SQL Editor after schema.sql
-- ============================================================

-- ============================================================
-- STORAGE BUCKET
-- Replaces: IndexedDB "lovcore-files" database
-- ============================================================

-- Create the 'files' bucket for user uploads (images, PDFs, documents)
-- Run this via the Supabase Dashboard:
--   Storage → New Bucket → Name: "files" → Public: OFF
--
-- Or via SQL (inserts into storage.buckets):
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'files',
  'files',
  false,                                      -- Private bucket, access via signed URLs
  52428800,                                    -- 50 MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- STORAGE POLICIES
-- Users can only access files in their own folder.
-- File path convention: {user_id}/{file_key}
-- ============================================================

-- SELECT: Users can read their own files
CREATE POLICY "storage_select_own_files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT: Users can upload files to their own folder
CREATE POLICY "storage_insert_own_files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: Users can update their own files
CREATE POLICY "storage_update_own_files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: Users can delete their own files
CREATE POLICY "storage_delete_own_files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================
-- FILE PATH CONVENTION
-- ============================================================
--
-- Current (IndexedDB):
--   Key: card ID (e.g. "1716451234567")
--   Ref: "indexeddb://1716451234567"
--
-- Target (Supabase Storage):
--   Path: "{user_id}/{card_id}"  e.g. "a1b2c3d4.../1716451234567"
--   Ref:  "supabase://1716451234567"
--
-- The app stores only the card ID in the thumbnail field.
-- The user_id prefix is added by the storage layer at upload time.
-- This way RLS ensures users can only access their own files.
--
-- To get a displayable URL:
--   supabase.storage.from('files').createSignedUrl(`${userId}/${cardId}`, 3600)
--   (Signed URL valid for 1 hour)
