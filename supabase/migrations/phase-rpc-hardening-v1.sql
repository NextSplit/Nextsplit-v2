-- phase-rpc-hardening-v1.sql
-- F2.4 + S4 (audit) — Track 2 foundation sprint
-- 2026-05-08
--
-- Scope: 8 SECURITY DEFINER RPCs that lacked caller-validation in their bodies.
-- Pre-Track-1, can_nudge had the same gap (escalated to Track 1 as S3, fixed
-- there). This migration applies the same pattern to the remaining eight.
--
-- Decision per RPC (after pre-flight read of pg_get_functiondef + grep of
-- call sites in src/):
--
--   Caller-owns-it (auth.uid() = p_*_id) — coach is the owner reading their
--   own row, or user is incrementing their own XP:
--     · coach_earnings_summary(p_coach_id)
--     · coach_earnings_ytd(p_coach_id)
--     · get_commission_rate(p_coach_id)
--     · increment_profile_xp(p_user_id, p_xp, p_season_xp)
--     · increment_season_xp(p_user_id, p_xp)
--
--   Caller-must-be-authenticated only — caller is involved but is not the
--   param subject (reviewer ≠ reviewed coach; user just left a club so
--   identity-bound check would race the row delete):
--     · decrement_club_members(p_club_id)
--     · refresh_coach_rating(p_coach_id)
--
--   Service-role only — no application call sites in src/ (verified via
--   grep), so the RPC has been a hanging abuse vector since phase-sl1:
--     · apply_split_leader_reward(p_leader_id, p_type)
--
-- All RPCs:
--   - retain SECURITY DEFINER (callers are users, not service_role)
--   - add SET search_path = public, pg_temp (schema-injection hygiene per
--     ns-backend-data-engineer R2 review)
--   - convert sql-language → plpgsql where needed for explicit RAISE
--
-- Idempotent: CREATE OR REPLACE; REVOKE/GRANT IF EXISTS.
--
-- Audit refs: docs/audit/audit-report-v1.md §F2.4, §S4. Track 1 §S3
-- (can_nudge guard) is the reference implementation — body check pattern,
-- ERRCODE 42501, helpful HINT.

BEGIN;

-- ============================================================
-- 1. Caller-owns-it: coach reads their OWN earnings.
-- ============================================================

CREATE OR REPLACE FUNCTION public.coach_earnings_summary(p_coach_id uuid)
RETURNS TABLE(period_month text, gross_gbp numeric, commission_gbp numeric, net_gbp numeric, source_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_coach_id THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501',
            HINT    = 'coach_earnings_summary can only be called for your own coach_id';
  END IF;

  RETURN QUERY
    SELECT ce.period_month,
           SUM(ce.gross_gbp),
           SUM(ce.commission_gbp),
           SUM(ce.net_gbp),
           COUNT(*)
      FROM public.coach_earnings ce
     WHERE ce.coach_id = p_coach_id
     GROUP BY ce.period_month
     ORDER BY ce.period_month DESC;
END;
$func$;

CREATE OR REPLACE FUNCTION public.coach_earnings_ytd(p_coach_id uuid)
RETURNS TABLE(gross_gbp numeric, commission_gbp numeric, net_gbp numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_coach_id THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501',
            HINT    = 'coach_earnings_ytd can only be called for your own coach_id';
  END IF;

  RETURN QUERY
    SELECT COALESCE(SUM(ce.gross_gbp), 0)::numeric,
           COALESCE(SUM(ce.commission_gbp), 0)::numeric,
           COALESCE(SUM(ce.net_gbp), 0)::numeric
      FROM public.coach_earnings ce
     WHERE ce.coach_id = p_coach_id
       AND ce.period_month >= to_char(date_trunc('year', now()), 'YYYY-MM');
END;
$func$;

CREATE OR REPLACE FUNCTION public.get_commission_rate(p_coach_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_rate numeric;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_coach_id THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501',
            HINT    = 'get_commission_rate can only be called for your own coach_id';
  END IF;

  SELECT CASE
    WHEN COUNT(*) >= 50 THEN 0.08
    WHEN COUNT(*) >= 25 THEN 0.10
    WHEN COUNT(*) >= 10 THEN 0.12
    ELSE 0.15
  END
    INTO v_rate
    FROM public.coaching_subscriptions
   WHERE coach_id = p_coach_id AND status = 'active';

  RETURN v_rate;
END;
$func$;

-- ============================================================
-- 2. Caller-owns-it: user increments their OWN XP.
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_profile_xp(p_user_id uuid, p_xp integer, p_season_xp integer DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501',
            HINT    = 'increment_profile_xp can only be called for your own user_id';
  END IF;

  UPDATE public.profiles
     SET season_xp = COALESCE(season_xp, 0) + p_season_xp
   WHERE id = p_user_id;
END;
$func$;

CREATE OR REPLACE FUNCTION public.increment_season_xp(p_user_id uuid, p_xp integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501',
            HINT    = 'increment_season_xp can only be called for your own user_id';
  END IF;

  UPDATE public.profiles
     SET season_xp = COALESCE(season_xp, 0) + p_xp
   WHERE id = p_user_id;
END;
$func$;

-- ============================================================
-- 3. Caller-authenticated only: caller is involved but is not the param
--    subject. Reviewer ≠ reviewed coach; member-leaving is post-row-delete
--    so identity-bound check would race the membership tombstone.
-- ============================================================

CREATE OR REPLACE FUNCTION public.refresh_coach_rating(p_coach_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501',
            HINT    = 'refresh_coach_rating requires an authenticated caller';
  END IF;

  UPDATE public.coach_profiles
     SET avg_rating   = (SELECT COALESCE(AVG(cr.rating::numeric), 0) FROM public.coach_reviews cr WHERE cr.coach_id = p_coach_id AND NOT cr.is_flagged),
         review_count = (SELECT COUNT(*) FROM public.coach_reviews cr WHERE cr.coach_id = p_coach_id AND NOT cr.is_flagged)
   WHERE user_id = p_coach_id;
END;
$func$;

CREATE OR REPLACE FUNCTION public.decrement_club_members(p_club_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501',
            HINT    = 'decrement_club_members requires an authenticated caller';
  END IF;

  UPDATE public.clubs
     SET member_count = GREATEST(0, COALESCE(member_count, 0) - 1)
   WHERE id = p_club_id;
END;
$func$;

-- ============================================================
-- 4. Service-role only: no app callers (verified via grep src/), so the
--    function should not be reachable by authenticated. Kept SECURITY
--    DEFINER for possible future trigger-based invocation by service_role.
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_split_leader_reward(p_leader_id uuid, p_type text DEFAULT 'month')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF p_type = 'month' THEN
    UPDATE public.profiles
       SET split_leader_reward_months     = COALESCE(split_leader_reward_months, 0) + 1,
           split_leader_total_conversions = COALESCE(split_leader_total_conversions, 0) + 1
     WHERE id = p_leader_id;
  ELSIF p_type = 'week' THEN
    UPDATE public.profiles
       SET split_leader_reward_weeks = COALESCE(split_leader_reward_weeks, 0) + 1
     WHERE id = p_leader_id;
  END IF;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.apply_split_leader_reward(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_split_leader_reward(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_split_leader_reward(uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.apply_split_leader_reward(uuid, text) TO service_role;

COMMIT;

-- ============================================================
-- Verification (run after apply via Supabase MCP execute_sql)
-- ============================================================
-- 1. Each body contains an auth-check (or service-role grant):
--    SELECT proname,
--           position('auth.uid()' IN pg_get_functiondef(oid)) > 0 AS has_auth_check
--      FROM pg_proc
--     WHERE proname IN (
--       'coach_earnings_summary','coach_earnings_ytd','get_commission_rate',
--       'increment_profile_xp','increment_season_xp',
--       'refresh_coach_rating','decrement_club_members'
--     );
--    Expect: has_auth_check = true for all.
-- 2. apply_split_leader_reward not callable by authenticated:
--    SELECT has_function_privilege('authenticated', 'apply_split_leader_reward(uuid, text)', 'execute');
--    Expect: false.
--    SELECT has_function_privilege('service_role', 'apply_split_leader_reward(uuid, text)', 'execute');
--    Expect: true.
-- 3. Cross-account smoke (manual, post-deploy):
--    Log in as user A. Try `SELECT * FROM coach_earnings_summary('<other-uuid>')` via supabase-js.
--    Expect: 42501 unauthorized.
-- 4. Smoke: legitimate calls still work (own-id):
--    Coach reads own earnings, user increments own XP — no error, expected results.
