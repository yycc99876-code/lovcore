-- ============================================================
-- Lovcore Storage Setup
-- Run in Supabase SQL Editor after schema.sql
-- ============================================================

-- ============================================================
-- STORAGE BUCKET
-- Replaces: IndexedDB "lovcore-files" database
-- ============================================================

-- Create the 'lovcore-files' bucket for user uploads (images, PDFs, documents)
-- Run this via the Supabase Dashboard:
--   Storage -> New Bucket -> Name: "lovcore-files" -> Public: OFF
--
-- Or via SQL (inserts into storage.buckets):
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lovcore-files',
  'lovcore-files',
  false,                                      -- Private bucket, access via signed URLs
  1073741824,                                  -- 1 GB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/webm',
    'audio/ogg',
    'audio/aac',
    'audio/x-m4a',
    'audio/flac',
    'audio/opus',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    'application/octet-stream',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = now();


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
    bucket_id = 'lovcore-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT: Users can upload files to their own folder
CREATE POLICY "storage_insert_own_files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'lovcore-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: Users can update their own files
CREATE POLICY "storage_update_own_files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'lovcore-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: Users can delete their own files
CREATE POLICY "storage_delete_own_files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'lovcore-files'
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
--   Path: "users/{user_id}/cards/{card_id}/original/source.{ext}"
--   Ref:  "supabase://1716451234567"
--
-- The app stores the full internal object path on each card.
-- The user_id segment is added by the storage layer at upload time.
-- Storage policies ensure users can only access their own files.
--
-- To get a displayable URL:
--   supabase.storage.from('lovcore-files').createSignedUrl(storagePath, 3600)
--   (Signed URL valid for 1 hour)
