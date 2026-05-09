-- phase-character-system-boost-loadout-v5.sql
-- 2026-05-09 — Character system V5 — boost loadout on race entry + simulator
--
-- Builds on:
--   · PR #29 (race schema + simulate_race)
--   · PR #34 (boost catalog + inventory + consume_boost RPC)
--
-- Changes:
--   1. enter_race(p_race_id, p_boost_loadout text[]) — extended signature.
--      Validates max 2 boosts per entry. For each boost in loadout: calls
--      consume_boost (caller-owns) which decrements quantity. Stores the
--      boost_ids in character_race_entries.boost_loadout jsonb.
--      Backward-compat: existing call sites passing only p_race_id still
--      work via DEFAULT '{}' on the new param.
--
--   2. simulate_race extended to apply boost effects from each entry's
--      boost_loadout jsonb. Looks up each boost_id in
--      character_boosts_catalog and aggregates per-stat multipliers:
--        speed_mult       = product of (1+pct) WHERE effect_stat='speed'
--        endurance_mult   = product of (1+pct) WHERE effect_stat='endurance'
--                         × product of (1+pct*0.5) WHERE effect_stat='resilience'
--        class_fit_mult   = product of (1+pct) WHERE effect_stat='class_fit'
--      Resilience boosts halve-into-endurance (placeholder until trail/
--      squad formats use resilience directly — keeps every boost feel
--      useful even on daily_5k where resilience wouldn't otherwise matter).
--
--      effective_base_speed       = base_speed_mps     × speed_mult
--      effective_endurance_factor = endurance_factor   × endurance_mult
--      effective_class_fit        = class_fit          × class_fit_mult
--      finish_secs = distance_m / (effective_base_speed × effective_class_fit
--                                  × effective_endurance_factor)
--
-- Determinism preserved — formula is still pure function of (snapshot,
-- format, boost_loadout). No RNG (council /council R2 + Gambling Act 2005
-- ss.6-9 compliance).
--
-- Idempotent: CREATE OR REPLACE FUNCTION.

BEGIN;

-- ============================================================
-- 1. enter_race(p_race_id, p_boost_loadout) — caller-owns
-- ============================================================
-- Drop the old signature first so the new one with extra param replaces
-- it cleanly (CREATE OR REPLACE doesn't change function signatures).

DROP FUNCTION IF EXISTS public.enter_race(uuid);

CREATE OR REPLACE FUNCTION public.enter_race(
  p_race_id        uuid,
  p_boost_loadout  text[] DEFAULT '{}'::text[]
)
RETURNS public.character_race_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_uid       uuid;
  v_race      public.character_races%ROWTYPE;
  v_char      public.characters%ROWTYPE;
  v_snapshot  jsonb;
  v_entry     public.character_race_entries%ROWTYPE;
  v_boost_id  text;
  v_loadout_clean text[];
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501',
            HINT    = 'enter_race requires an authenticated caller';
  END IF;

  SELECT * INTO v_race FROM public.character_races WHERE id = p_race_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'race not found' USING ERRCODE = '42P01';
  END IF;
  IF now() >= v_race.entries_close_at THEN
    RAISE EXCEPTION 'entries closed'
      USING ERRCODE = '22023',
            HINT    = 'Entries lock at entries_close_at';
  END IF;
  IF v_race.finalized_at IS NOT NULL THEN
    RAISE EXCEPTION 'race finalized' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_char FROM public.characters WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'character not created'
      USING ERRCODE = '23502',
            HINT    = 'Pick a build class on /you before entering races';
  END IF;

  -- Boost loadout validation: max 2, each must exist in catalog + user
  -- inventory must have >= 1 quantity. Re-entering an existing entry with
  -- a different loadout REPLACES (no refund of previous boosts — that's
  -- documented in the picker UI).
  v_loadout_clean := COALESCE(p_boost_loadout, '{}'::text[]);
  IF array_length(v_loadout_clean, 1) > 2 THEN
    RAISE EXCEPTION 'max 2 boosts per entry'
      USING ERRCODE = '22023',
            HINT    = 'Pick at most 2 boosts for one race';
  END IF;

  -- Ensure boosts are unique within the loadout (no double-stack of one
  -- boost — pick 2 different ones for diversity).
  IF array_length(v_loadout_clean, 1) IS NOT NULL
     AND array_length(v_loadout_clean, 1) <> array_length(ARRAY(SELECT DISTINCT unnest(v_loadout_clean)), 1)
  THEN
    RAISE EXCEPTION 'duplicate boost in loadout' USING ERRCODE = '22023';
  END IF;

  -- Consume each boost (or check ownership if this is a re-entry that
  -- already has the same loadout — to keep the contract simple, we ALWAYS
  -- consume on entry. UPSERT on conflict means: previous loadout's boosts
  -- were already consumed; this call additionally consumes the new ones.
  -- Picker UX warns the user before letting them re-enter.
  FOREACH v_boost_id IN ARRAY v_loadout_clean LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.character_boosts_catalog
       WHERE id = v_boost_id AND enabled = true
    ) THEN
      RAISE EXCEPTION 'unknown boost: %', v_boost_id USING ERRCODE = '42704';
    END IF;
    -- Inline ownership check + decrement (mirrors consume_boost RPC body
    -- but inlined so we can run it within the same SECDEF context against
    -- v_uid rather than via the auth.uid()-checked consume_boost RPC).
    UPDATE public.character_boost_inventory
       SET quantity = quantity - 1
     WHERE user_id = v_uid AND boost_id = v_boost_id AND quantity > 0;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'no inventory for boost: %', v_boost_id
        USING ERRCODE = '23502',
              HINT    = 'You do not own this boost or your stack is empty';
    END IF;
  END LOOP;

  -- Freeze character snapshot at entry time. Mid-race level-ups don't
  -- retroactively affect the entry (qa-risk circuit-breaker).
  v_snapshot := jsonb_build_object(
    'build_class',     v_char.build_class,
    'level',           v_char.level,
    'speed_stat',      v_char.speed_stat,
    'endurance_stat',  v_char.endurance_stat,
    'resilience_stat', v_char.resilience_stat
  );

  INSERT INTO public.character_race_entries (race_id, user_id, character_snapshot, boost_loadout)
  VALUES (p_race_id, v_uid, v_snapshot, to_jsonb(v_loadout_clean))
  ON CONFLICT (race_id, user_id) DO UPDATE
    SET character_snapshot = EXCLUDED.character_snapshot,
        boost_loadout      = EXCLUDED.boost_loadout,
        entered_at         = now()
  RETURNING * INTO v_entry;

  RETURN v_entry;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.enter_race(uuid, text[]) TO authenticated;

-- ============================================================
-- 2. simulate_race(p_race_id) — service-role; now boost-aware
-- ============================================================
-- Per-entry effective stats now incorporate boost_loadout multipliers.
-- Resilience boosts contribute at 50% rate to endurance until trail/
-- squad formats land that use resilience directly.

CREATE OR REPLACE FUNCTION public.simulate_race(p_race_id uuid)
RETURNS public.character_race_results
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_race      public.character_races%ROWTYPE;
  v_finishing jsonb;
  v_timeline  jsonb;
  v_result    public.character_race_results%ROWTYPE;
BEGIN
  SELECT * INTO v_race FROM public.character_races WHERE id = p_race_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'race not found' USING ERRCODE = '42P01'; END IF;
  IF v_race.finalized_at IS NOT NULL THEN
    SELECT * INTO v_result FROM public.character_race_results WHERE race_id = p_race_id;
    RETURN v_result;
  END IF;

  WITH e AS (
    SELECT
      re.user_id,
      re.boost_loadout,
      re.character_snapshot->>'build_class'         AS build_class,
      (re.character_snapshot->>'speed_stat')::int   AS speed_stat,
      (re.character_snapshot->>'endurance_stat')::int AS endurance_stat,
      (re.character_snapshot->>'resilience_stat')::int AS resilience_stat
    FROM public.character_race_entries re
   WHERE re.race_id = p_race_id
  ),
  -- Aggregate per-stat boost multipliers from each entry's boost_loadout.
  -- LEFT JOIN against catalog so entries with empty loadouts still show.
  bm AS (
    SELECT
      e.user_id,
      COALESCE(EXP(SUM(LN(1 + b.effect_pct)) FILTER (WHERE b.effect_stat = 'speed')), 1) AS speed_mult,
      COALESCE(
        EXP(SUM(LN(1 + b.effect_pct)) FILTER (WHERE b.effect_stat = 'endurance'))
        * EXP(SUM(LN(1 + b.effect_pct * 0.5)) FILTER (WHERE b.effect_stat = 'resilience')),
        1
      ) AS endurance_mult,
      COALESCE(EXP(SUM(LN(1 + b.effect_pct)) FILTER (WHERE b.effect_stat = 'class_fit')), 1) AS class_fit_mult
    FROM e
    LEFT JOIN LATERAL jsonb_array_elements_text(COALESCE(e.boost_loadout, '[]'::jsonb)) AS bid(boost_id) ON true
    LEFT JOIN public.character_boosts_catalog b ON b.id = bid.boost_id AND b.enabled = true
    GROUP BY e.user_id
  ),
  c AS (
    SELECT
      e.user_id, e.build_class, e.speed_stat, e.endurance_stat, e.resilience_stat,
      CASE
        WHEN v_race.format = 'daily_5k'        AND e.build_class = 'track_star'        THEN 1.15
        WHEN v_race.format = 'daily_5k'        AND e.build_class = 'marathon_monster'  THEN 0.93
        WHEN v_race.format = 'daily_5k'        AND e.build_class = 'trail_champion'    THEN 0.98
        WHEN v_race.format = 'monthly_major'   AND e.build_class = 'marathon_monster'  THEN 1.15
        WHEN v_race.format = 'monthly_major'   AND e.build_class = 'track_star'        THEN 0.92
        WHEN v_race.format = 'monthly_major'   AND e.build_class = 'trail_champion'    THEN 1.02
        WHEN v_race.format = 'weekly_marquee'  AND e.build_class = 'trail_champion'    THEN 1.10
        WHEN v_race.format = 'weekly_marquee'  AND e.build_class = 'track_star'        THEN 0.98
        WHEN v_race.format = 'weekly_marquee'  AND e.build_class = 'marathon_monster'  THEN 1.05
        WHEN v_race.format = 'squad_ekiden'    AND e.build_class = 'trail_champion'    THEN 1.08
        ELSE 1.00
      END AS class_fit,
      GREATEST(2.5, 2.5 + (e.speed_stat::numeric * 0.15)) AS base_speed_mps,
      GREATEST(0.5, LEAST(1.5, 0.7 + (e.endurance_stat::numeric * 0.02))) AS endurance_factor,
      bm.speed_mult, bm.endurance_mult, bm.class_fit_mult
    FROM e JOIN bm USING (user_id)
  ),
  f AS (
    SELECT
      user_id, build_class,
      class_fit * class_fit_mult                 AS effective_class_fit,
      base_speed_mps * speed_mult                AS effective_base_speed,
      endurance_factor * endurance_mult          AS effective_endurance,
      v_race.distance_m::numeric / (
        (base_speed_mps * speed_mult)
        * (class_fit * class_fit_mult)
        * (endurance_factor * endurance_mult)
      ) AS finish_secs_raw
    FROM c
  ),
  r AS (
    SELECT user_id, build_class, ROUND(finish_secs_raw)::int AS finish_secs,
      RANK() OVER (ORDER BY finish_secs_raw ASC) AS rank
    FROM f
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', user_id, 'build_class', build_class, 'finish_secs', finish_secs, 'rank', rank) ORDER BY rank), '[]'::jsonb)
    INTO v_finishing FROM r;

  -- Timeline: 11 waypoints per runner, applies same boost-adjusted speed.
  WITH e AS (
    SELECT
      re.user_id,
      re.boost_loadout,
      re.character_snapshot->>'build_class'         AS build_class,
      (re.character_snapshot->>'speed_stat')::int   AS speed_stat,
      (re.character_snapshot->>'endurance_stat')::int AS endurance_stat,
      (re.character_snapshot->>'resilience_stat')::int AS resilience_stat
    FROM public.character_race_entries re WHERE re.race_id = p_race_id
  ),
  bm AS (
    SELECT
      e.user_id,
      COALESCE(EXP(SUM(LN(1 + b.effect_pct)) FILTER (WHERE b.effect_stat = 'speed')), 1) AS speed_mult,
      COALESCE(
        EXP(SUM(LN(1 + b.effect_pct)) FILTER (WHERE b.effect_stat = 'endurance'))
        * EXP(SUM(LN(1 + b.effect_pct * 0.5)) FILTER (WHERE b.effect_stat = 'resilience')),
        1
      ) AS endurance_mult,
      COALESCE(EXP(SUM(LN(1 + b.effect_pct)) FILTER (WHERE b.effect_stat = 'class_fit')), 1) AS class_fit_mult
    FROM e
    LEFT JOIN LATERAL jsonb_array_elements_text(COALESCE(e.boost_loadout, '[]'::jsonb)) AS bid(boost_id) ON true
    LEFT JOIN public.character_boosts_catalog b ON b.id = bid.boost_id AND b.enabled = true
    GROUP BY e.user_id
  ),
  c AS (
    SELECT
      e.user_id,
      CASE
        WHEN v_race.format = 'daily_5k'        AND e.build_class = 'track_star'        THEN 1.15
        WHEN v_race.format = 'daily_5k'        AND e.build_class = 'marathon_monster'  THEN 0.93
        WHEN v_race.format = 'daily_5k'        AND e.build_class = 'trail_champion'    THEN 0.98
        WHEN v_race.format = 'monthly_major'   AND e.build_class = 'marathon_monster'  THEN 1.15
        WHEN v_race.format = 'monthly_major'   AND e.build_class = 'track_star'        THEN 0.92
        WHEN v_race.format = 'monthly_major'   AND e.build_class = 'trail_champion'    THEN 1.02
        WHEN v_race.format = 'weekly_marquee'  AND e.build_class = 'trail_champion'    THEN 1.10
        WHEN v_race.format = 'weekly_marquee'  AND e.build_class = 'track_star'        THEN 0.98
        WHEN v_race.format = 'weekly_marquee'  AND e.build_class = 'marathon_monster'  THEN 1.05
        WHEN v_race.format = 'squad_ekiden'    AND e.build_class = 'trail_champion'    THEN 1.08
        ELSE 1.00
      END AS class_fit,
      GREATEST(2.5, 2.5 + (e.speed_stat::numeric * 0.15)) AS base_speed_mps,
      GREATEST(0.5, LEAST(1.5, 0.7 + (e.endurance_stat::numeric * 0.02))) AS endurance_factor,
      bm.speed_mult, bm.endurance_mult, bm.class_fit_mult
    FROM e JOIN bm USING (user_id)
  ),
  s AS (
    SELECT
      user_id,
      (base_speed_mps * speed_mult) * (class_fit * class_fit_mult) * (endurance_factor * endurance_mult) AS mps,
      v_race.distance_m::numeric / (
        (base_speed_mps * speed_mult)
        * (class_fit * class_fit_mult)
        * (endurance_factor * endurance_mult)
      ) AS finish_secs_raw
    FROM c
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', user_id,
    'splits', jsonb_build_array(
      0,
      LEAST(v_race.distance_m, ROUND(mps * (finish_secs_raw * 0.10)))::int,
      LEAST(v_race.distance_m, ROUND(mps * (finish_secs_raw * 0.20)))::int,
      LEAST(v_race.distance_m, ROUND(mps * (finish_secs_raw * 0.30)))::int,
      LEAST(v_race.distance_m, ROUND(mps * (finish_secs_raw * 0.40)))::int,
      LEAST(v_race.distance_m, ROUND(mps * (finish_secs_raw * 0.50)))::int,
      LEAST(v_race.distance_m, ROUND(mps * (finish_secs_raw * 0.60)))::int,
      LEAST(v_race.distance_m, ROUND(mps * (finish_secs_raw * 0.70)))::int,
      LEAST(v_race.distance_m, ROUND(mps * (finish_secs_raw * 0.80)))::int,
      LEAST(v_race.distance_m, ROUND(mps * (finish_secs_raw * 0.90)))::int,
      v_race.distance_m
    )
  )), '[]'::jsonb) INTO v_timeline FROM s;

  INSERT INTO public.character_race_results (race_id, finishing_order, result_timeline)
  VALUES (p_race_id, v_finishing, v_timeline)
  RETURNING * INTO v_result;
  UPDATE public.character_races SET finalized_at = now() WHERE id = p_race_id;
  RETURN v_result;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.simulate_race(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.simulate_race(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.simulate_race(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.simulate_race(uuid) TO service_role;

COMMIT;
