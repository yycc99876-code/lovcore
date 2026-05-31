-- ============================================================
-- Lovcore Row Level Security Policies
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PROFILES TABLE POLICIES
-- ============================================================

-- MVP: Users can read and update their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ============================================================
-- CARDS TABLE POLICIES
-- Users can only access their own cards.
-- ============================================================

-- MVP: Full CRUD on own cards
CREATE POLICY "cards_select_own"
  ON public.cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "cards_insert_own"
  ON public.cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cards_update_own"
  ON public.cards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cards_delete_own"
  ON public.cards FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- CARD_BODIES TABLE POLICIES
-- ============================================================

-- MVP: Full CRUD on own card bodies
CREATE POLICY "card_bodies_select_own"
  ON public.card_bodies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "card_bodies_insert_own"
  ON public.card_bodies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "card_bodies_update_own"
  ON public.card_bodies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "card_bodies_delete_own"
  ON public.card_bodies FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- SPACES TABLE POLICIES
-- Users can only access their own spaces.
-- ============================================================

-- MVP: Full CRUD on own spaces
CREATE POLICY "spaces_select_own"
  ON public.spaces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "spaces_insert_own"
  ON public.spaces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spaces_update_own"
  ON public.spaces FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- MVP: Users cannot delete system spaces
CREATE POLICY "spaces_delete_own_non_system"
  ON public.spaces FOR DELETE
  USING (auth.uid() = user_id AND system = false);


-- ============================================================
-- SPACE_CARDS TABLE POLICIES
-- Must validate ownership through space or card user_id
-- ============================================================

-- MVP: Users can read space_cards where they own the space
CREATE POLICY "space_cards_select_own"
  ON public.space_cards FOR SELECT
  USING (auth.uid() = user_id);

-- MVP: Users can insert space_cards for their own spaces
CREATE POLICY "space_cards_insert_own"
  ON public.space_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- MVP: Users can delete space_cards from their own spaces
CREATE POLICY "space_cards_delete_own"
  ON public.space_cards FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- FILES TABLE POLICIES
-- Users can only access their own file records.
-- ============================================================

-- MVP: Full CRUD on own files
CREATE POLICY "files_select_own"
  ON public.files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "files_insert_own"
  ON public.files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "files_update_own"
  ON public.files FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "files_delete_own"
  ON public.files FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- AI_EVENTS TABLE POLICIES
-- Users can only access their own AI event records.
-- ============================================================

-- MVP: Users can read their own events (for history/debugging)
CREATE POLICY "ai_events_select_own"
  ON public.ai_events FOR SELECT
  USING (auth.uid() = user_id);

-- MVP: Users can insert their own events
CREATE POLICY "ai_events_insert_own"
  ON public.ai_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: UPDATE/DELETE not needed for MVP — events are append-only logs
-- Future: Admin role can read all events for analytics


-- ============================================================
-- INGESTION_JOBS TABLE POLICIES
-- Users can only access their own ingestion jobs.
-- ============================================================

-- MVP: Users can read their own jobs
CREATE POLICY "ingestion_jobs_select_own"
  ON public.ingestion_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- MVP: Users can insert their own jobs
CREATE POLICY "ingestion_jobs_insert_own"
  ON public.ingestion_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- MVP: Users can update their own jobs (status changes)
CREATE POLICY "ingestion_jobs_update_own"
  ON public.ingestion_jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- USER_SETTINGS TABLE POLICIES
-- ============================================================

-- MVP: Users can read and update their own settings
CREATE POLICY "user_settings_select_own"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert_own"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update_own"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- STORAGE BUCKET POLICIES (run in Supabase Dashboard -> Storage)
-- ============================================================
-- These must be created via the Supabase Dashboard or API, not SQL.
-- Placeholder instructions:
--
-- 1. Create bucket "files" (private)
-- 2. Policy: "Users can upload to own folder"
--    - INSERT: path starts with auth.uid()::text || '/'
-- 3. Policy: "Users can read own files"
--    - SELECT: path starts with auth.uid()::text || '/'
-- 4. Policy: "Users can delete own files"
--    - DELETE: path starts with auth.uid()::text || '/'


-- ============================================================
-- NOTES
-- ============================================================
--
-- MVP Policies: All policies above are marked MVP. They enforce
-- single-user data isolation with no sharing or collaboration.
--
-- Future Enhancements (post-MVP):
-- - Shared spaces: Allow read access to spaces shared via a
--   space_shares join table
-- - Team/organization spaces: Group-level access control
-- - Admin analytics: Admin role can read ai_events across users
-- - Public cards: Allow SELECT on cards where visibility = 'public'
