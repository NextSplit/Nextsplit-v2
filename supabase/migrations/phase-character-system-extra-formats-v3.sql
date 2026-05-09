-- phase-character-system-extra-formats-v3.sql
-- 2026-05-09 — Character system V3 — weekly_marquee + monthly_major seeders
--
-- Builds on PR #29 (phase-character-system-races-v2.sql) which shipped the
-- character_races/_entries/_results tables + enter_race/simulate_race/
-- seed_daily_race RPCs + the daily 5K cron wiring.
--
-- This migration adds two new seeders:
--   · seed_weekly_marquee() — 10K race that runs Mon→Sun. Idempotent
--     per ISO calendar week. Entries open Mon 00:00 UTC, close Sun
--     21:00 UTC, resolve Sun 22:05 UTC (cron-aligned).
--   · seed_monthly_major() — half marathon (21.1K) that runs the
--     full calendar month. Idempotent per (year, month). Entries open
--     1st 00:00 UTC, close 28th 21:00 UTC (Feb-safe), resolve 28th
--     22:05 UTC.
--
-- The 22:05 UTC resolve time matches the existing race-tick cron in
-- vercel.json so the same daily fire wakes all 3 seeders + simulates
-- any due-resolved race.
--
-- The class_fit table inside simulate_race already covers all 5 formats
-- (daily_5k / weekly_marquee / monthly_major / on_demand_1v1 /
-- squad_ekiden) — no simulator changes needed.
--
-- Both new RPCs follow F2.4 hardening: SECURITY DEFINER + SET search_path
-- = public, pg_temp + REVOKE from PUBLIC/anon/authenticated + GRANT to
-- service_role only.

BEGIN;

-- ============================================================
-- seed_weekly_marquee() — Mon→Sun 10K
-- ============================================================
-- ISO calendar week is the canonical period boundary. Mon = ISO day 1.
-- Idempotent: returns existing race if one already exists for the
-- current ISO (year, week) tuple.

CREATE OR REPLACE FUNCTION public.seed_weekly_marquee()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_now           timestamptz := now();
  v_iso_year      int := extract(isoyear from v_now)::int;
  v_iso_week      int := extract(week    from v_now)::int;
  v_existing      uuid;
  v_new           uuid;
  v_week_start    date;
  v_open_at       timestamptz;
  v_close_at      timestamptz;
  v_resolve_at    timestamptz;
BEGIN
  -- Match by date_part(year/week) on entries_open_at to keep the seeder
  -- O(1)-lookup-friendly. character_races_format_starts_idx covers this.
  SELECT id INTO v_existing
    FROM public.character_races
   WHERE format = 'weekly_marquee'
     AND extract(isoyear from entries_open_at AT TIME ZONE 'UTC') = v_iso_year
     AND extract(week    from entries_open_at AT TIME ZONE 'UTC') = v_iso_week;
  IF FOUND THEN RETURN v_existing; END IF;

  -- ISO week start = Monday. date_trunc('week', ...) returns Monday.
  v_week_start := (date_trunc('week', v_now AT TIME ZONE 'UTC'))::date;

  v_open_at    := (v_week_start::text || ' 00:00:00+00')::timestamptz;
  v_close_at   := (v_week_start + 6)::text || ' 21:00:00+00'; -- Sunday 21:00 UTC
  v_close_at   := v_close_at::timestamptz;
  v_resolve_at := (v_week_start + 6)::text || ' 22:05:00+00'; -- Sunday 22:05 UTC
  v_resolve_at := v_resolve_at::timestamptz;

  INSERT INTO public.character_races (format, name, distance_m, entries_open_at, entries_close_at, resolves_at)
  VALUES (
    'weekly_marquee',
    'Weekly Marquee 10K — Wk ' || v_iso_week::text || ' ' || v_iso_year::text,
    10000,
    v_open_at,
    v_close_at,
    v_resolve_at
  )
  RETURNING id INTO v_new;

  RETURN v_new;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.seed_weekly_marquee() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_weekly_marquee() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_weekly_marquee() FROM anon;
GRANT  EXECUTE ON FUNCTION public.seed_weekly_marquee() TO service_role;

-- ============================================================
-- seed_monthly_major() — full-calendar-month half marathon
-- ============================================================
-- Idempotent per (year, month) tuple. Window: 1st 00:00 UTC → 28th
-- 21:00 UTC (Feb-safe — Feb has 28 days minimum, so 28th is in every
-- month) → 28th 22:05 UTC resolve.

CREATE OR REPLACE FUNCTION public.seed_monthly_major()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_now         timestamptz := now();
  v_year        int := extract(year  from v_now)::int;
  v_month       int := extract(month from v_now)::int;
  v_existing    uuid;
  v_new         uuid;
  v_first       date;
  v_close_day   date;
  v_open_at     timestamptz;
  v_close_at    timestamptz;
  v_resolve_at  timestamptz;
  v_month_label text;
BEGIN
  SELECT id INTO v_existing
    FROM public.character_races
   WHERE format = 'monthly_major'
     AND extract(year  from entries_open_at AT TIME ZONE 'UTC') = v_year
     AND extract(month from entries_open_at AT TIME ZONE 'UTC') = v_month;
  IF FOUND THEN RETURN v_existing; END IF;

  v_first       := make_date(v_year, v_month, 1);
  v_close_day   := make_date(v_year, v_month, 28);
  v_open_at     := (v_first::text     || ' 00:00:00+00')::timestamptz;
  v_close_at    := (v_close_day::text || ' 21:00:00+00')::timestamptz;
  v_resolve_at  := (v_close_day::text || ' 22:05:00+00')::timestamptz;
  v_month_label := to_char(v_first, 'Mon YYYY');

  INSERT INTO public.character_races (format, name, distance_m, entries_open_at, entries_close_at, resolves_at)
  VALUES (
    'monthly_major',
    'Monthly Major Half — ' || v_month_label,
    21097,                      -- exact half-marathon distance in metres
    v_open_at,
    v_close_at,
    v_resolve_at
  )
  RETURNING id INTO v_new;

  RETURN v_new;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.seed_monthly_major() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_monthly_major() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_monthly_major() FROM anon;
GRANT  EXECUTE ON FUNCTION public.seed_monthly_major() TO service_role;

COMMIT;
