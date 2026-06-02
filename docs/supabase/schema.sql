-- ============================================================
-- Lovcore Database Schema (Extended)
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- This file can be executed as a single script from an empty Supabase project.
-- ============================================================

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Future: CREATE EXTENSION IF NOT EXISTS "vector"; -- for pgvector embeddings

-- ============================================================
-- SHARED TRIGGER FUNCTION
-- Must be created BEFORE any trigger that references it.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- PROFILES TABLE
-- Mirrors auth.users with app-specific fields
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  display_name TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- CARDS TABLE
-- Replaces: localStorage key "lovcore_items"
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cards (
  -- Primary key: keep TEXT to match existing Date.now().toString() IDs
  id            TEXT PRIMARY KEY,

  -- Owner
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Card type: 'image' | 'link' | 'article' | 'note' | 'pdf' | 'video' | 'quote' | 'code' | 'audio' | 'file'
  type          TEXT NOT NULL CHECK (type IN ('image', 'link', 'article', 'note', 'pdf', 'video', 'quote', 'code', 'audio', 'file')),

  -- Content fields
  title         TEXT NOT NULL DEFAULT '',
  preview       TEXT,                               -- Short preview/excerpt for card grid
  content       TEXT NOT NULL DEFAULT '',
  summary       TEXT NOT NULL DEFAULT '',

  -- Metadata
  source_url    TEXT,                               -- Original URL if scraped
  domain        TEXT,                               -- Extracted domain from source_url
  file_size     TEXT,                               -- Display string e.g. "1.2 MB"
  page_count    INTEGER,                            -- For PDFs
  duration      TEXT,                               -- For videos e.g. "05:14"
  thumbnail     TEXT,                               -- Image URL or storage ref
  color_palette TEXT[],                             -- Array of hex strings
  tags          TEXT[] NOT NULL DEFAULT '{}',        -- Semantic tags
  note_bg_color TEXT,                               -- Custom note background hex
  meta          JSONB DEFAULT '{}'::jsonb,           -- Extensible metadata (keyClaims, whyItMatters, etc.)

  -- AI enrichment (denormalized from meta for query access)
  key_claims    TEXT[],                             -- AI-extracted key claims
  why_it_matters TEXT,                              -- AI-generated context

  -- Status: 'uploading' | 'analyzing' | 'ready' | 'failed'
  status        TEXT NOT NULL DEFAULT 'ready'
                CHECK (status IN ('uploading', 'analyzing', 'ready', 'failed')),

  -- pgvector embedding (future)
  -- embedding   vector(1536),                      -- Uncomment after enabling "vector" extension

  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_cards_user_id        ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_created   ON public.cards(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cards_user_type      ON public.cards(user_id, type);
CREATE INDEX IF NOT EXISTS idx_cards_tags           ON public.cards USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_cards_status         ON public.cards(user_id, status);
CREATE INDEX IF NOT EXISTS idx_cards_domain         ON public.cards(user_id, domain);

CREATE TRIGGER set_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- CARD_BODIES TABLE
-- Stores Tiptap rich content separately for performance
-- ============================================================
CREATE TABLE IF NOT EXISTS public.card_bodies (
  card_id       TEXT PRIMARY KEY REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  tiptap_json   JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Tiptap ProseMirror document tree
  plain_text    TEXT NOT NULL DEFAULT '',              -- Denormalized plain text for search
  html          TEXT,                                  -- Rendered HTML

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_bodies_user_id ON public.card_bodies(user_id);

CREATE TRIGGER set_card_bodies_updated_at
  BEFORE UPDATE ON public.card_bodies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- SPACES TABLE
-- Replaces: localStorage key "lovcore_spaces"
-- ============================================================
CREATE TABLE IF NOT EXISTS public.spaces (
  -- Primary key: keep TEXT to match existing IDs like "space-all", "user-space-xxx"
  id            TEXT PRIMARY KEY,

  -- Owner
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Space properties
  name          TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT 'smart' CHECK (type IN ('default', 'smart', 'manual')),
  system        BOOLEAN NOT NULL DEFAULT false,     -- Built-in spaces cannot be deleted
  color         TEXT,                               -- Hex color for UI
  description   TEXT,

  -- Smart space filters
  query         TEXT,                               -- Search query string
  selected_type TEXT,                               -- Card type filter ('all', 'image', etc.)
  tags          TEXT[] NOT NULL DEFAULT '{}',        -- Tag filter

  -- Smart space rules (extensible)
  rules         JSONB DEFAULT '{}'::jsonb,           -- Future: complex filtering rules

  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spaces_user_id ON public.spaces(user_id);

-- Auto-update updated_at
CREATE TRIGGER set_spaces_updated_at
  BEFORE UPDATE ON public.spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- SPACE_CARDS TABLE (join table)
-- Maps cards to spaces (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.space_cards (
  space_id      TEXT NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  card_id       TEXT NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  position      INTEGER DEFAULT 0,                   -- Manual ordering within space
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (space_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_space_cards_user_id ON public.space_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_space_cards_card_id ON public.space_cards(card_id);


-- ============================================================
-- FILES TABLE
-- Replaces: IndexedDB "lovcore-files"
-- ============================================================
CREATE TABLE IF NOT EXISTS public.files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id       TEXT REFERENCES public.cards(id) ON DELETE SET NULL,

  storage_path  TEXT NOT NULL,                       -- Supabase Storage path e.g. "user123/card456"
  original_name TEXT,                                -- Original filename
  mime_type     TEXT NOT NULL,                       -- e.g. "image/png", "application/pdf"
  size          BIGINT NOT NULL DEFAULT 0,           -- File size in bytes
  width         INTEGER,                             -- Image/video width in pixels
  height        INTEGER,                             -- Image/video height in pixels
  duration      NUMERIC,                             -- Audio/video duration in seconds
  kind          TEXT,                                -- File category: image/pdf/video/audio/document/archive/code/file

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id  ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_card_id  ON public.files(card_id);
CREATE UNIQUE INDEX IF NOT EXISTS files_storage_path_key ON public.files(storage_path);
CREATE INDEX IF NOT EXISTS idx_files_kind ON public.files(user_id, kind);

CREATE TRIGGER set_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- AI_EVENTS TABLE
-- Records all AI API calls for analytics and debugging
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id       TEXT REFERENCES public.cards(id) ON DELETE SET NULL,

  -- Event type: 'autocomplete' | 'ghost_correct' | 'rewrite' | 'transcribe' | 'summarize' | 'analyze_card' | 'scrape_url'
  event_type    TEXT NOT NULL,
  payload       JSONB,                               -- Request payload (sanitized)
  result        JSONB,                               -- Response result (sanitized)
  model         TEXT,                                -- AI model used
  tokens_in     INTEGER,                             -- Input token count
  tokens_out    INTEGER,                             -- Output token count
  latency_ms    INTEGER,                             -- Request duration in ms
  error         TEXT,                                -- Error message if failed

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_events_user_id      ON public.ai_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_events_user_type    ON public.ai_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_ai_events_created      ON public.ai_events(user_id, created_at DESC);


-- ============================================================
-- INGESTION_JOBS TABLE
-- Tracks async card ingestion/processing jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id       TEXT REFERENCES public.cards(id) ON DELETE CASCADE,

  -- Job type: 'url_scrape' | 'file_upload' | 'ai_analyze' | 'search_index'
  job_type      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  payload       JSONB DEFAULT '{}'::jsonb,
  result        JSONB,
  error         TEXT,
  attempts      INTEGER NOT NULL DEFAULT 0,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_user_id   ON public.ingestion_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status    ON public.ingestion_jobs(user_id, status);

CREATE TRIGGER set_ingestion_jobs_updated_at
  BEFORE UPDATE ON public.ingestion_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- USER_SETTINGS TABLE
-- Per-user preferences and configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  theme         TEXT DEFAULT 'system',               -- 'light' | 'dark' | 'system'
  language      TEXT DEFAULT 'en',
  ai_model      TEXT,                                -- Preferred AI model
  editor_config JSONB DEFAULT '{}'::jsonb,           -- Editor preferences (font size, etc.)
  onboarding_complete BOOLEAN DEFAULT false,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- (Policies defined in rls.sql — run rls.sql after this file)
-- ============================================================
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_bodies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_cards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_jobs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings    ENABLE ROW LEVEL SECURITY;
