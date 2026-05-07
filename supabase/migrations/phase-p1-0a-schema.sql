-- ─── Phase P1.0a: P1.1 Prerequisites — Schema PR ───────────────────────────
-- Source: docs/ROADMAP.md §6 P1.0a (council pass 2026-05-07, verdict HOLD).
-- Resolves council pre-mortem item 1 (silent CHECK failure during F1) and the
-- "System inserts feed posts" RLS over-permission.
--
-- Idempotent: every statement uses IF NOT EXISTS / IF EXISTS, the CHECK
-- replacement is wrapped in a DO block, and the RPC uses CREATE OR REPLACE.
-- Safe to re-run.
--
-- Scope correction vs. roadmap v0.3 P1.0a sub-item 1: the per-day UNIQUE on
-- training_logs(user_id, logged_at::date) is descoped here. Dedup of plan-
-- prescribed sessions is already enforced by an existing composite UNIQUE on
-- (user_id, plan_id, week_n, day_i, session_i) — see useTrainingLog.ts:106
-- upsert. A per-day UNIQUE would incorrectly block legitimate two-a-day runs.
-- Ad-hoc-session dedup is handled application-side in the P1.1 server action.
-- This correction is logged in roadmap v0.3.1 §9 decision log.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. squad_feed.milestone_type — add 'session_logged' to CHECK ─────────────
-- The original constraint is anonymously named via inline CHECK on the column
-- (CREATE TABLE squad_feed in phase-sl1-squads.sql:166). Look it up by shape
-- rather than guessing the name.

DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.squad_feed'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%milestone_type%IN%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.squad_feed DROP CONSTRAINT %I', v_constraint);
  END IF;
END $$;

ALTER TABLE public.squad_feed
  ADD CONSTRAINT squad_feed_milestone_type_check
  CHECK (milestone_type IN (
    'plan_complete',
    'race_result',
    'distance_pb',
    'streak_milestone',
    'squad_goal_reached',
    'first_run',
    'joined_squad',
    'session_logged'
  ));

-- ── 2. squad_feed.training_log_id — link a session_logged card to its log ───
-- Nullable: pre-existing milestone rows (plan_complete, race_result, …) have
-- no associated training_logs row. ON DELETE SET NULL preserves feed history
-- if a user deletes the underlying log.

ALTER TABLE public.squad_feed
  ADD COLUMN IF NOT EXISTS training_log_id uuid
    REFERENCES public.training_logs(id) ON DELETE SET NULL;

-- Idempotent same-squad de-dup: the same training_log can post to a given
-- squad's feed only once. Partial index so other milestone types (with NULL
-- training_log_id) don't conflict.

CREATE UNIQUE INDEX IF NOT EXISTS squad_feed_squad_log_unique
  ON public.squad_feed (squad_id, training_log_id)
  WHERE training_log_id IS NOT NULL;

-- ── 3. profiles.share_logs_with_squad — opt-out preference ──────────────────
-- Default true: the loop is the founding thesis. Users can opt out per-squad
-- in P1.x or globally here. NOT NULL with constant DEFAULT is fast on PG ≥ 11
-- (no table rewrite).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS share_logs_with_squad boolean NOT NULL DEFAULT true;

-- ── 4. Lock down direct INSERT on squad_feed ────────────────────────────────
-- The existing "System inserts feed posts" policy let any authenticated user
-- INSERT any milestone_type with their own user_id — meaning a client could
-- forge plan_complete / race_result / first_run cards. Drop the policy and
-- REVOKE the role-level grant. All inserts now flow through the SECURITY
-- DEFINER RPC below.

DROP POLICY IF EXISTS "System inserts feed posts" ON public.squad_feed;
REVOKE INSERT ON public.squad_feed FROM authenticated;

-- ── 5. RPC: insert_squad_feed_on_log ────────────────────────────────────────
-- Called from the P1.1 log-session server action. Validates ownership +
-- share preference, then fans out one feed card per active squad membership.
-- Returns the inserted feed_card ids (empty array if user opted out, has no
-- squads, or all inserts hit the partial UNIQUE).
--
-- SECURITY DEFINER: runs as function owner, bypasses RLS. The function is the
-- only legitimate path to write squad_feed.

CREATE OR REPLACE FUNCTION public.insert_squad_feed_on_log(p_log_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller         uuid := auth.uid();
  v_log_user       uuid;
  v_log_km         numeric(8,2);
  v_log_secs       integer;
  v_share          boolean;
  v_inserted_ids   uuid[] := ARRAY[]::uuid[];
  v_new_id         uuid;
  v_squad_id       uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'insert_squad_feed_on_log: not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Validate the log row exists, belongs to caller, capture its summary.
  SELECT user_id, km, duration_secs
    INTO v_log_user, v_log_km, v_log_secs
    FROM public.training_logs
   WHERE id = p_log_id;

  IF v_log_user IS NULL THEN
    RAISE EXCEPTION 'insert_squad_feed_on_log: log % not found', p_log_id USING ERRCODE = 'P0002';
  END IF;

  IF v_log_user <> v_caller THEN
    RAISE EXCEPTION 'insert_squad_feed_on_log: log % not owned by caller', p_log_id USING ERRCODE = '42501';
  END IF;

  -- Check share preference. Default is true (set in step 3) so this is a
  -- conscious opt-out check, not a missing-row guard.
  SELECT share_logs_with_squad INTO v_share
    FROM public.profiles
   WHERE id = v_caller;

  IF v_share IS NOT TRUE THEN
    RETURN v_inserted_ids;
  END IF;

  -- Fan out: one feed card per active squad. ON CONFLICT DO NOTHING handles
  -- the partial UNIQUE (re-runs from a retried server action are idempotent).
  FOR v_squad_id IN
    SELECT squad_id
      FROM public.squad_members
     WHERE user_id = v_caller
       AND removed_at IS NULL
  LOOP
    INSERT INTO public.squad_feed
      (squad_id, user_id, milestone_type, value_km, value_secs, training_log_id)
    VALUES
      (v_squad_id, v_caller, 'session_logged', v_log_km, v_log_secs, p_log_id)
    ON CONFLICT (squad_id, training_log_id)
      WHERE training_log_id IS NOT NULL
      DO NOTHING
    RETURNING id INTO v_new_id;

    IF v_new_id IS NOT NULL THEN
      v_inserted_ids := array_append(v_inserted_ids, v_new_id);
      v_new_id := NULL;
    END IF;
  END LOOP;

  RETURN v_inserted_ids;
END;
$$;

-- Clients call the RPC; nothing else.
REVOKE ALL ON FUNCTION public.insert_squad_feed_on_log(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_squad_feed_on_log(uuid) TO authenticated;

COMMIT;

-- ── Verification queries ────────────────────────────────────────────────────
-- Run after applying:
--
--   SELECT pg_get_constraintdef(oid)
--     FROM pg_constraint
--    WHERE conrelid = 'public.squad_feed'::regclass
--      AND contype = 'c';
--   -- Expected to include 'session_logged'.
--
--   SELECT column_name, is_nullable, column_default
--     FROM information_schema.columns
--    WHERE table_schema = 'public'
--      AND table_name = 'profiles'
--      AND column_name = 'share_logs_with_squad';
--   -- Expected: NO, true.
--
--   SELECT polname, polcmd
--     FROM pg_policy
--    WHERE polrelid = 'public.squad_feed'::regclass;
--   -- Expected: no INSERT policy named "System inserts feed posts".
--
--   SELECT has_function_privilege(
--     'authenticated', 'public.insert_squad_feed_on_log(uuid)', 'EXECUTE'
--   );
--   -- Expected: t.
