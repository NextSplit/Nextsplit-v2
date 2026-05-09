-- phase-character-system-races-v2.sql
-- 2026-05-09 — Character system V2 — race schema + simulation
--
-- Builds on PR #28 (phase-character-system-v1.sql) which shipped the
-- characters table + award_session_xp + recompute_xp_rate_multiplier RPCs
-- + the BuildClassCard picker on /you.
--
-- This migration adds:
--   · races            — catalogue of scheduled races (daily/weekly/monthly/1v1/ekiden)
--   · race_entries     — user submissions, frozen character_snapshot
--   · race_results     — finalized finishing_order + replay timeline
--   · enter_race       — caller-owns RPC; validates window + character; freezes snapshot
--   · simulate_race    — service-role RPC; computes deterministic results
--   · seed_daily_race  — service-role RPC; idempotent daily-5K seeder
--
-- Race outcomes are FULLY DETERMINISTIC from (character_snapshot, class_fit,
-- race_format) — no RNG (council /council R2 + spec edit PR #26: Gambling Act
-- 2005 ss.6-9 concern). rng_seed column is retained on races as inert field
-- for future replay-determinism scripts; simulator does NOT consume it.
--
-- All new RPCs follow the F2.4 hardening pattern (PR #19): SECURITY DEFINER +
-- explicit auth.uid() / role-check body guard + SET search_path = public, pg_temp.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION,
-- DROP POLICY IF EXISTS + CREATE POLICY for RLS.

BEGIN;

-- ============================================================
-- 1. races — catalogue of scheduled races
-- ============================================================

CREATE TABLE IF NOT EXISTS public.character_races (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  format            text NOT NULL CHECK (format IN (
                       'daily_5k', 'weekly_marquee', 'monthly_major',
                       'on_demand_1v1', 'squad_ekiden')),
  name              text NOT NULL,
  distance_m        int NOT NULL CHECK (distance_m > 0 AND distance_m <= 200000),
  entries_open_at   timestamptz NOT NULL DEFAULT now(),
  entries_close_at  timestamptz NOT NULL,
  resolves_at       timestamptz NOT NULL,
  rng_seed          bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  finalized_at      timestamptz NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT character_races_window_ordered CHECK (entries_open_at <= entries_close_at AND entries_close_at <= resolves_at)
);

ALTER TABLE public.character_races ENABLE ROW LEVEL SECURITY;

-- Race catalogue is authenticated-readable. Anon traffic blocked (matches
-- the post-PR-#24 RLS hardening pattern on community-entries tables).
DROP POLICY IF EXISTS "Authenticated reads character races" ON public.character_races;
CREATE POLICY "Authenticated reads character races"
  ON public.character_races
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE go through SECDEF RPCs only — no direct writes from clients.

CREATE INDEX IF NOT EXISTS character_races_resolves_at_idx ON public.character_races (resolves_at) WHERE finalized_at IS NULL;
CREATE INDEX IF NOT EXISTS character_races_format_starts_idx ON public.character_races (format, entries_open_at DESC);

-- ============================================================
-- 2. race_entries — user submissions to a race
-- ============================================================

CREATE TABLE IF NOT EXISTS public.character_race_entries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id             uuid NOT NULL REFERENCES public.character_races(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  character_snapshot  jsonb NOT NULL,
  boost_loadout       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- empty for V2; reserved for boost system
  entered_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (race_id, user_id)
);

ALTER TABLE public.character_race_entries ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all entries (for leaderboard display). Insert
-- is blocked at RLS level — only enter_race RPC (SECURITY DEFINER) can write.
DROP POLICY IF EXISTS "Authenticated reads character race entries" ON public.character_race_entries;
CREATE POLICY "Authenticated reads character race entries"
  ON public.character_race_entries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS character_race_entries_race_idx ON public.character_race_entries (race_id);
CREATE INDEX IF NOT EXISTS character_race_entries_user_idx ON public.character_race_entries (user_id);

-- ============================================================
-- 3. race_results — finalized race outcomes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.character_race_results (
  race_id          uuid PRIMARY KEY REFERENCES public.character_races(id) ON DELETE CASCADE,
  finishing_order  jsonb NOT NULL,   -- [{user_id, finish_secs, rank}, ...]
  result_timeline  jsonb NOT NULL,   -- per-runner per-bucket positions for replay
  computed_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.character_race_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated reads character race results" ON public.character_race_results;
CREATE POLICY "Authenticated reads character race results"
  ON public.character_race_results
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 4. RPC: enter_race(p_race_id) — caller-owns
-- ============================================================

CREATE OR REPLACE FUNCTION public.enter_race(p_race_id uuid)
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
            HINT    = 'Entries lock at entries_close_at; this race no longer accepts new submissions';
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

  -- Freeze character snapshot at entry time. Mid-race level-ups / stat
  -- changes do NOT retroactively affect the entry (qa-risk requirement
  -- from /council R2 — circuit-breaker semantics).
  v_snapshot := jsonb_build_object(
    'build_class',     v_char.build_class,
    'level',           v_char.level,
    'speed_stat',      v_char.speed_stat,
    'endurance_stat',  v_char.endurance_stat,
    'resilience_stat', v_char.resilience_stat
  );

  INSERT INTO public.character_race_entries (race_id, user_id, character_snapshot)
  VALUES (p_race_id, v_uid, v_snapshot)
  ON CONFLICT (race_id, user_id) DO UPDATE
    SET character_snapshot = EXCLUDED.character_snapshot,
        entered_at         = now()
  RETURNING * INTO v_entry;

  RETURN v_entry;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.enter_race(uuid) TO authenticated;

-- ============================================================
-- 5. RPC: simulate_race(p_race_id) — service-role only
-- ============================================================
-- Computes finishing_order + result_timeline from entries deterministically.
-- Per the proposal §3.3 (rng_jitter deleted in PR #26):
--   base_speed_mps      = 2.5 + (speed_stat * 0.15), floor 2.5
--   class_fit_modifier  = function of (build_class, race.format) — ±15%
--   endurance_factor    = 0.7 + (endurance_stat * 0.02), clamped 0.5..1.5
--   finish_secs         = distance_m / (base_speed_mps * class_fit * endurance_factor)
-- result_timeline stores 11 position waypoints per runner (start + 10 evenly
-- spaced) so the client can drive a 10-step CSS keyframe replay animation
-- without re-running the formula.

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
  IF NOT FOUND THEN
    RAISE EXCEPTION 'race not found' USING ERRCODE = '42P01';
  END IF;

  -- Idempotent: already finalized → return existing result row.
  IF v_race.finalized_at IS NOT NULL THEN
    SELECT * INTO v_result FROM public.character_race_results WHERE race_id = p_race_id;
    RETURN v_result;
  END IF;

  -- Compute per-runner finish_secs + rank.
  WITH e AS (
    SELECT
      user_id,
      character_snapshot->>'build_class'                 AS build_class,
      (character_snapshot->>'speed_stat')::int           AS speed_stat,
      (character_snapshot->>'endurance_stat')::int       AS endurance_stat,
      (character_snapshot->>'resilience_stat')::int      AS resilience_stat
    FROM public.character_race_entries
   WHERE race_id = p_race_id
  ),
  c AS (
    SELECT
      user_id,
      build_class,
      speed_stat,
      endurance_stat,
      resilience_stat,
      -- Class fit per format. Track Star buffs short/sprint; Marathon
      -- Monster buffs distance; Trail Champion buffs marquee/elevation.
      CASE
        WHEN v_race.format = 'daily_5k'        AND build_class = 'track_star'        THEN 1.15
        WHEN v_race.format = 'daily_5k'        AND build_class = 'marathon_monster'  THEN 0.93
        WHEN v_race.format = 'daily_5k'        AND build_class = 'trail_champion'    THEN 0.98
        WHEN v_race.format = 'monthly_major'   AND build_class = 'marathon_monster'  THEN 1.15
        WHEN v_race.format = 'monthly_major'   AND build_class = 'track_star'        THEN 0.92
        WHEN v_race.format = 'monthly_major'   AND build_class = 'trail_champion'    THEN 1.02
        WHEN v_race.format = 'weekly_marquee'  AND build_class = 'trail_champion'    THEN 1.10
        WHEN v_race.format = 'weekly_marquee'  AND build_class = 'track_star'        THEN 0.98
        WHEN v_race.format = 'weekly_marquee'  AND build_class = 'marathon_monster'  THEN 1.05
        WHEN v_race.format = 'squad_ekiden'    AND build_class = 'trail_champion'    THEN 1.08
        ELSE 1.00
      END                                                                    AS class_fit,
      GREATEST(2.5, 2.5 + (speed_stat::numeric * 0.15))                       AS base_speed_mps,
      GREATEST(0.5, LEAST(1.5, 0.7 + (endurance_stat::numeric * 0.02)))       AS endurance_factor
    FROM e
  ),
  f AS (
    SELECT
      user_id,
      build_class,
      class_fit,
      base_speed_mps,
      endurance_factor,
      v_race.distance_m::numeric / (base_speed_mps * class_fit * endurance_factor) AS finish_secs_raw
    FROM c
  ),
  r AS (
    SELECT
      user_id,
      build_class,
      ROUND(finish_secs_raw)::int AS finish_secs,
      base_speed_mps * class_fit * endurance_factor AS effective_mps,
      RANK() OVER (ORDER BY finish_secs_raw ASC) AS rank
    FROM f
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'user_id',     user_id,
      'build_class', build_class,
      'finish_secs', finish_secs,
      'rank',        rank
    ) ORDER BY rank), '[]'::jsonb)
    INTO v_finishing
  FROM r;

  -- Result timeline: 11 position waypoints per runner (0% → 100%).
  WITH e AS (
    SELECT
      user_id,
      character_snapshot->>'build_class' AS build_class,
      (character_snapshot->>'speed_stat')::int     AS speed_stat,
      (character_snapshot->>'endurance_stat')::int AS endurance_stat
    FROM public.character_race_entries
   WHERE race_id = p_race_id
  ),
  c AS (
    SELECT
      user_id,
      CASE
        WHEN v_race.format = 'daily_5k'        AND build_class = 'track_star'        THEN 1.15
        WHEN v_race.format = 'daily_5k'        AND build_class = 'marathon_monster'  THEN 0.93
        WHEN v_race.format = 'daily_5k'        AND build_class = 'trail_champion'    THEN 0.98
        WHEN v_race.format = 'monthly_major'   AND build_class = 'marathon_monster'  THEN 1.15
        WHEN v_race.format = 'monthly_major'   AND build_class = 'track_star'        THEN 0.92
        WHEN v_race.format = 'monthly_major'   AND build_class = 'trail_champion'    THEN 1.02
        WHEN v_race.format = 'weekly_marquee'  AND build_class = 'trail_champion'    THEN 1.10
        WHEN v_race.format = 'weekly_marquee'  AND build_class = 'track_star'        THEN 0.98
        WHEN v_race.format = 'weekly_marquee'  AND build_class = 'marathon_monster'  THEN 1.05
        WHEN v_race.format = 'squad_ekiden'    AND build_class = 'trail_champion'    THEN 1.08
        ELSE 1.00
      END                                                              AS class_fit,
      GREATEST(2.5, 2.5 + (speed_stat::numeric * 0.15))                AS base_speed_mps,
      GREATEST(0.5, LEAST(1.5, 0.7 + (endurance_stat::numeric * 0.02))) AS endurance_factor
    FROM e
  ),
  splits AS (
    SELECT
      user_id,
      base_speed_mps * class_fit * endurance_factor                AS mps,
      v_race.distance_m::numeric / (base_speed_mps * class_fit * endurance_factor) AS finish_secs_raw
    FROM c
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'user_id', user_id,
      'splits',  jsonb_build_array(
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
    )), '[]'::jsonb)
    INTO v_timeline
  FROM splits;

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

-- ============================================================
-- 6. RPC: seed_daily_race() — service-role; idempotent
-- ============================================================
-- Ensures today's daily 5K race exists. Window: entries open at 00:00 UTC,
-- close at 22:00 UTC, simulator fires from 22:05 UTC via /api/cron/race-tick.

CREATE OR REPLACE FUNCTION public.seed_daily_race()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_today      date := (now() AT TIME ZONE 'UTC')::date;
  v_existing   uuid;
  v_new        uuid;
  v_open_at    timestamptz;
  v_close_at   timestamptz;
  v_resolve_at timestamptz;
BEGIN
  SELECT id INTO v_existing
    FROM public.character_races
   WHERE format = 'daily_5k'
     AND date(entries_open_at AT TIME ZONE 'UTC') = v_today;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  v_open_at    := (v_today::text || ' 00:00:00+00')::timestamptz;
  v_close_at   := (v_today::text || ' 22:00:00+00')::timestamptz;
  v_resolve_at := (v_today::text || ' 22:05:00+00')::timestamptz;

  INSERT INTO public.character_races (format, name, distance_m, entries_open_at, entries_close_at, resolves_at)
  VALUES (
    'daily_5k',
    'Daily 5K — ' || to_char(v_today, 'DD Mon YYYY'),
    5000,
    v_open_at,
    v_close_at,
    v_resolve_at
  )
  RETURNING id INTO v_new;

  RETURN v_new;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.seed_daily_race() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_daily_race() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_daily_race() FROM anon;
GRANT  EXECUTE ON FUNCTION public.seed_daily_race() TO service_role;

COMMIT;
