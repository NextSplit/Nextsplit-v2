-- phase-rls-community-entries-hardening-v1.sql
-- 2026-05-08 — /council R2 RED finding: challenge_entries + virtual_race_entries
-- carry "Public reads entries" SELECT policies with USING (true) and no TO
-- clause, meaning polroles = {-} (PUBLIC including anon). Any unauthenticated
-- caller can scrape every row in both tables.
--
-- The tables hold per-user race / challenge entry data including finish_time,
-- position, pace. Once the gamification character_snapshot field lands here,
-- world-read becomes a paid-tier-membership disclosure vector (security
-- /council R1 + R2 finding).
--
-- Fix: drop the over-broad "Public reads ..." policies, recreate scoped TO
-- authenticated. Logged-in users can still see other entrants for leaderboard
-- display (current intent); anonymous traffic cannot scrape entry rows.
--
-- The "User manages own entries" / "User manages own race entries" policies
-- (which gate INSERT/UPDATE/DELETE/SELECT to auth.uid() = user_id) are kept
-- as-is — they already correctly restrict writes.
--
-- The virtual_races (race CATALOGUE — name, description, distance) policy
-- "Public reads virtual races" is intentionally world-readable and stays
-- unchanged. Only race ENTRIES are tightened.
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE POLICY.

BEGIN;

-- challenge_entries
DROP POLICY IF EXISTS "Public reads entries" ON public.challenge_entries;

CREATE POLICY "Authenticated reads entries"
  ON public.challenge_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- virtual_race_entries
DROP POLICY IF EXISTS "Public reads race entries" ON public.virtual_race_entries;

CREATE POLICY "Authenticated reads race entries"
  ON public.virtual_race_entries
  FOR SELECT
  TO authenticated
  USING (true);

COMMIT;

-- Verification (run after apply):
-- SELECT polname, polcmd, polroles::regrole[]
--   FROM pg_policy
--  WHERE polrelid IN ('public.challenge_entries'::regclass,
--                     'public.virtual_race_entries'::regclass)
--  ORDER BY polrelid, polname;
-- Expect: "Authenticated reads ..." with polroles = {authenticated}
--         "User manages own ..." with polroles = {-} (still all roles, but USING gates)
