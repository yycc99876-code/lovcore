-- ============================================================
-- Migration: Add 'file' type and files table enhancements
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- 1. Add 'file' to cards type CHECK constraint
-- First drop the existing constraint, then recreate with 'file' included
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_type_check;
ALTER TABLE public.cards ADD CONSTRAINT cards_type_check
  CHECK (type IN ('image', 'link', 'article', 'note', 'pdf', 'video', 'quote', 'code', 'audio', 'file'));

-- 2. Add 'kind' column to files table (image/pdf/video/audio/document/archive/code/file)
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS kind TEXT;

-- 3. Add 'updated_at' column to files table
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 4. Add unique constraint on storage_path for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS files_storage_path_key ON public.files(storage_path);

-- 5. Add trigger for files.updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_files_updated_at'
      AND tgrelid = 'public.files'::regclass
  ) THEN
    CREATE TRIGGER set_files_updated_at
      BEFORE UPDATE ON public.files
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- 6. Add index on files.kind for filtering
CREATE INDEX IF NOT EXISTS idx_files_kind ON public.files(user_id, kind);
