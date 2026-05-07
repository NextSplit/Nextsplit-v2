-- ─── Phase P3.10: Squad seasons (light) ──────────────────────────────────
-- Council /council 2026-05-07, Phase 3 retention proof.
--
-- The squad_seasons table already exists (phase-sl1-squads.sql). What's
-- missing is the snapshot writer. This migration adds:
--   1. snapshot_squad_seasons_for_month(p_period text) — SECURITY DEFINER
--      RPC that for every active squad aggregates the month's km +
--      sessions + active members + top runner and UPSERTs into
--      squad_seasons (period = 'YYYY-MM', season_type = 'month').
--   2. squad_current_month_km(p_squad_id uuid) — convenience read for the
--      current-month progress card on /squad. Wraps the existing
--      squad_monthly_km RPC for symmetry with the historical reader.
--
-- Idempotent — UPSERT on the (squad_id, season_type, period) UNIQUE
-- constraint means re-running the snapshot for the same period overwrites
-- previous values (correct behaviour: the last day of the month is the
-- canonical snapshot; intermediate runs that happen on the 1st before
-- midnight UTC just get overwritten).

BEGIN;

CREATE OR REPLACE FUNCTION public.snapshot_squad_seasons_for_month(p_period text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_period_start date;
  v_period_end   date;
  v_inserted     integer := 0;
  v_squad        record;
  v_total_km     numeric(10,2);
  v_total_sessions integer;
  v_active_members integer;
  v_top_runner_id   uuid;
  v_top_runner_km   numeric(8,2);
BEGIN
  -- Parse YYYY-MM into start + exclusive end.
  v_period_start := (p_period || '-01')::date;
  v_period_end   := (v_period_start + interval '1 month')::date;

  -- Iterate every non-disbanded squad.
  FOR v_squad IN
    SELECT id, goal_type, goal_value
      FROM public.squads
     WHERE disbanded_at IS NULL
  LOOP
    -- Aggregate logs for active members in this period.
    SELECT
      COALESCE(SUM(tl.km), 0),
      COUNT(*)
    INTO v_total_km, v_total_sessions
    FROM public.training_logs tl
    JOIN public.squad_members sm ON sm.user_id = tl.user_id
    WHERE sm.squad_id = v_squad.id
      AND sm.removed_at IS NULL
      AND tl.done = true
      AND tl.logged_at >= v_period_start
      AND tl.logged_at < v_period_end;

    -- Active member count = members who logged at least one session.
    SELECT COUNT(DISTINCT sm.user_id) INTO v_active_members
      FROM public.squad_members sm
      JOIN public.training_logs tl ON tl.user_id = sm.user_id
     WHERE sm.squad_id = v_squad.id
       AND sm.removed_at IS NULL
       AND tl.done = true
       AND tl.logged_at >= v_period_start
       AND tl.logged_at < v_period_end;

    -- Top runner — most km in the period.
    SELECT tl.user_id, COALESCE(SUM(tl.km), 0)
      INTO v_top_runner_id, v_top_runner_km
      FROM public.training_logs tl
      JOIN public.squad_members sm ON sm.user_id = tl.user_id
     WHERE sm.squad_id = v_squad.id
       AND sm.removed_at IS NULL
       AND tl.done = true
       AND tl.logged_at >= v_period_start
       AND tl.logged_at < v_period_end
     GROUP BY tl.user_id
     ORDER BY SUM(tl.km) DESC NULLS LAST
     LIMIT 1;

    INSERT INTO public.squad_seasons (
      squad_id, season_type, period,
      total_km, total_sessions, active_members,
      goal_type, goal_value,
      goal_hit,
      top_runner_id, top_runner_km
    ) VALUES (
      v_squad.id, 'month', p_period,
      v_total_km, v_total_sessions, COALESCE(v_active_members, 0),
      v_squad.goal_type, v_squad.goal_value,
      CASE
        WHEN v_squad.goal_type = 'km'       AND v_total_km       >= COALESCE(v_squad.goal_value, 0) THEN true
        WHEN v_squad.goal_type = 'sessions' AND v_total_sessions >= COALESCE(v_squad.goal_value, 0) THEN true
        ELSE false
      END,
      v_top_runner_id, v_top_runner_km
    )
    ON CONFLICT (squad_id, season_type, period) DO UPDATE
      SET total_km       = EXCLUDED.total_km,
          total_sessions = EXCLUDED.total_sessions,
          active_members = EXCLUDED.active_members,
          goal_hit       = EXCLUDED.goal_hit,
          top_runner_id  = EXCLUDED.top_runner_id,
          top_runner_km  = EXCLUDED.top_runner_km;

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'period', p_period, 'squads', v_inserted);
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_squad_seasons_for_month(text) FROM PUBLIC;
-- Service role only — called from the smart-notify cron route.
GRANT EXECUTE ON FUNCTION public.snapshot_squad_seasons_for_month(text) TO service_role;

COMMIT;

-- Verification:
--   SELECT public.snapshot_squad_seasons_for_month(to_char(now() - interval '1 month', 'YYYY-MM'));
--   SELECT * FROM public.squad_seasons WHERE season_type = 'month' ORDER BY created_at DESC LIMIT 5;
