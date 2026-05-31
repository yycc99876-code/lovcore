-- ============================================================
-- Lovcore Row Level Security Policies
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- CARDS TABLE POLICIES
-- Users can only access their own cards.
-- ============================================================

-- SELECT: Users see only their own cards
CREATE POLICY "cards_select_own"
  ON public.cards
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only insert cards for themselves
CREATE POLICY "cards_insert_own"
  ON public.cards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own cards
CREATE POLICY "cards_update_own"
  ON public.cards
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own cards
CREATE POLICY "cards_delete_own"
  ON public.cards
  FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- SPACES TABLE POLICIES
-- Users can only access their own spaces.
-- ============================================================

-- SELECT: Users see only their own spaces
CREATE POLICY "spaces_select_own"
  ON public.spaces
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only insert spaces for themselves
CREATE POLICY "spaces_insert_own"
  ON public.spaces
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own spaces
CREATE POLICY "spaces_update_own"
  ON public.spaces
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own non-system spaces
-- System spaces (system = true) cannot be deleted via RLS
CREATE POLICY "spaces_delete_own_non_system"
  ON public.spaces
  FOR DELETE
  USING (auth.uid() = user_id AND system = false);


-- ============================================================
-- NOTES
-- ============================================================
--
-- 1. All policies use auth.uid() which returns the UUID of the
--    currently authenticated user from the JWT token.
--
-- 2. The user_id column must be set by the application on INSERT.
--    Supabase does NOT auto-fill it — the client must pass it.
--
-- 3. System spaces (default spaces seeded on first login) have
--    system = true. The DELETE policy prevents users from removing
--    them. The app layer should also enforce this.
--
-- 4. To test policies in SQL Editor, run:
--      SELECT set_config('request.jwt.claims', '{"sub":"<user-uuid>"}', true);
--    Then run queries as that simulated user.
