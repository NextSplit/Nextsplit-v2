-- phase-character-system-quest-rewards-v7.sql
-- 2026-05-10 — Character system V7 — daily-quest reward grants
--
-- Builds on:
--   · PR #34 (grant_boost RPC + boost catalog)
--   · PR #37 (character_reward_claims tracking table — kind='quest' was
--     reserved for this RPC)
--
-- The DailyQuests UI (src/components/DailyQuests.tsx) is pure client-side
-- derivation from training_logs / weeklyKm / streak. There's no DB-backed
-- quest state. This RPC re-computes each quest's predicate server-side so
-- it's the canonical truth at grant time, then writes a claim row keyed
-- by (user_id, period_key) for idempotency.
--
-- Quest → boost mapping (all common — quests are easy + frequent):
--   log_today    → speed_tonic       (period: today UTC)
--   streak_3     → endurance_brew    (period: today UTC, but predicate is 3-day streak)
--   weekly_km    → grit_bar          (period: ISO week)
--   sessions_3   → speed_tonic       (period: ISO week)
--
-- Period-key format keeps natural rollover boundaries:
--   day-bound:  '<quest_id>_<YYYY-MM-DD>'
--   week-bound: '<quest_id>_<YYYY>_<WEEK>'

BEGIN;

CREATE OR REPLACE FUNCTION public.claim_daily_quest(
  p_user_id  uuid,
  p_quest_id text
)
RETURNS TABLE(
  item_kind   text,
  item_id     text,
  quest_id    text,
  period_key  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_today      date := (now() AT TIME ZONE 'UTC')::date;
  v_iso_year   int  := extract(isoyear from now())::int;
  v_iso_week   int  := extract(week    from now())::int;
  v_week_start date := (date_trunc('week', now() AT TIME ZONE 'UTC'))::date;
  v_period_key text;
  v_done       boolean := false;
  v_count      int;
  v_total_km   numeric;
  v_streak_ok  int;
  v_item_kind  text;
  v_item_id    text;
BEGIN
  CASE p_quest_id
    WHEN 'log_today' THEN
      v_period_key := 'log_today_' || v_today::text;
      SELECT count(*) INTO v_count FROM public.training_logs
       WHERE user_id = p_user_id AND done = true
         AND logged_at::date = v_today;
      v_done := v_count > 0;
      v_item_kind := 'boost'; v_item_id := 'speed_tonic';

    WHEN 'streak_3' THEN
      v_period_key := 'streak_3_' || v_today::text;
      -- 3 consecutive days of done logs ending today (or yesterday — match
      -- computeStreak semantics where today not yet logged still counts).
      WITH dates AS (
        SELECT generate_series(v_today - interval '2 days', v_today, '1 day')::date AS d
      )
      SELECT count(*) INTO v_streak_ok FROM dates d
       WHERE EXISTS (
         SELECT 1 FROM public.training_logs
          WHERE user_id = p_user_id AND done = true AND logged_at::date = d.d
       );
      v_done := v_streak_ok = 3;
      v_item_kind := 'boost'; v_item_id := 'endurance_brew';

    WHEN 'weekly_km' THEN
      v_period_key := 'weekly_km_' || v_iso_year::text || '_' || v_iso_week::text;
      SELECT COALESCE(SUM(km), 0) INTO v_total_km FROM public.training_logs
       WHERE user_id = p_user_id AND done = true
         AND logged_at::date >= v_week_start;
      v_done := v_total_km >= 30;
      v_item_kind := 'boost'; v_item_id := 'grit_bar';

    WHEN 'sessions_3' THEN
      v_period_key := 'sessions_3_' || v_iso_year::text || '_' || v_iso_week::text;
      SELECT count(*) INTO v_count FROM public.training_logs
       WHERE user_id = p_user_id AND done = true
         AND logged_at::date >= v_week_start;
      v_done := v_count >= 3;
      v_item_kind := 'boost'; v_item_id := 'speed_tonic';

    ELSE
      RETURN; -- unknown quest_id → no-op
  END CASE;

  IF NOT v_done THEN RETURN; END IF;

  -- Idempotency: skip if already claimed for this period.
  IF EXISTS (
    SELECT 1 FROM public.character_reward_claims
     WHERE user_id = p_user_id AND reward_kind = 'quest' AND reward_key = v_period_key
  ) THEN
    RETURN;
  END IF;

  PERFORM public.grant_boost(p_user_id, v_item_id, 1);

  INSERT INTO public.character_reward_claims (user_id, reward_kind, reward_key, granted_item_kind, granted_item_id)
  VALUES (p_user_id, 'quest', v_period_key, v_item_kind, v_item_id);

  item_kind  := v_item_kind;
  item_id    := v_item_id;
  quest_id   := p_quest_id;
  period_key := v_period_key;
  RETURN NEXT;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.claim_daily_quest(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_daily_quest(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_daily_quest(uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.claim_daily_quest(uuid, text) TO service_role;

COMMIT;
