-- ─── Phase SL2 — Split Leader Depth ─────────────────────────────────────────
-- Trophy Room, Squad Seasons, Public Pages, Crown Avatar, Coach Pipeline,
-- Inactivity Monitoring, Leadership Transfer
-- Run after: phase-sl1-squads.sql

-- ── Squad table additions ─────────────────────────────────────────────────────
ALTER TABLE squads
  ADD COLUMN IF NOT EXISTS coach_prompt_shown_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_km_all_time     numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sessions_all_time integer DEFAULT 0;

-- ── Squad achievements (trophy room entries) ──────────────────────────────────
-- Table already created in SL1 migration; ensure columns exist
ALTER TABLE squad_achievements
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS icon        text DEFAULT '🏆',
  ADD COLUMN IF NOT EXISTS metadata    jsonb DEFAULT '{}'::jsonb;

-- ── Squad seasons ─────────────────────────────────────────────────────────────
-- Table already created in SL1 migration; extend it
ALTER TABLE squad_seasons
  ADD COLUMN IF NOT EXISTS active_members   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS top_runner_id    uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS top_runner_name  text,
  ADD COLUMN IF NOT EXISTS top_runner_km    numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snapshot_at      timestamptz DEFAULT now();

-- ── Inactivity tracking on squad_members ─────────────────────────────────────
ALTER TABLE squad_members
  ADD COLUMN IF NOT EXISTS inactivity_prompted_at timestamptz;

-- ── Profiles: crown/leader fields ────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_accessories jsonb DEFAULT '[]'::jsonb;

-- ── RPC: snapshot a squad's current month into squad_seasons ─────────────────
CREATE OR REPLACE FUNCTION snapshot_squad_season(p_squad_id uuid, p_period text, p_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_km        numeric(10,2);
  v_sessions  integer;
  v_members   integer;
  v_goal_hit  boolean := false;
  v_squad     record;
BEGIN
  SELECT * INTO v_squad FROM squads WHERE id = p_squad_id;

  SELECT
    COALESCE(SUM(tl.distance_km), 0),
    COUNT(*)
  INTO v_km, v_sessions
  FROM training_logs tl
  JOIN squad_members sm ON sm.user_id = tl.user_id
  WHERE sm.squad_id = p_squad_id
    AND sm.removed_at IS NULL
    AND to_char(tl.logged_at, 'YYYY-MM') = p_period;

  SELECT COUNT(*) INTO v_members
  FROM squad_members
  WHERE squad_id = p_squad_id AND removed_at IS NULL;

  IF v_squad.goal_type = 'km' AND v_squad.goal_value IS NOT NULL THEN
    v_goal_hit := v_km >= v_squad.goal_value;
  ELSIF v_squad.goal_type = 'sessions' AND v_squad.goal_value IS NOT NULL THEN
    v_goal_hit := v_sessions >= v_squad.goal_value;
  END IF;

  INSERT INTO squad_seasons (squad_id, season_type, period, total_km, total_sessions, active_members, goal_hit, snapshot_at)
  VALUES (p_squad_id, p_type, p_period, v_km, v_sessions, v_members, v_goal_hit, now())
  ON CONFLICT (squad_id, season_type, period) DO UPDATE
    SET total_km = EXCLUDED.total_km,
        total_sessions = EXCLUDED.total_sessions,
        active_members = EXCLUDED.active_members,
        goal_hit = EXCLUDED.goal_hit,
        snapshot_at = now();
END;
$$;

-- Unique constraint for upsert to work
ALTER TABLE squad_seasons
  DROP CONSTRAINT IF EXISTS squad_seasons_squad_season_period_uniq;
ALTER TABLE squad_seasons
  ADD CONSTRAINT squad_seasons_squad_season_period_uniq
  UNIQUE (squad_id, season_type, period);

-- ── RPC: get all-time squad km (across all members) ─────────────────────────
CREATE OR REPLACE FUNCTION squad_alltime_km(p_squad_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(tl.distance_km), 0)
  FROM training_logs tl
  JOIN squad_members sm ON sm.user_id = tl.user_id
  WHERE sm.squad_id = p_squad_id;
$$;

-- ── RLS: squad_achievements ───────────────────────────────────────────────────
ALTER TABLE squad_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "squad achievements visible to members" ON squad_achievements;
CREATE POLICY "squad achievements visible to members" ON squad_achievements
  FOR SELECT USING (
    squad_id IN (
      SELECT squad_id FROM squad_members
      WHERE user_id = auth.uid() AND removed_at IS NULL
      UNION
      SELECT id FROM squads WHERE leader_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "squad achievements inserted by system" ON squad_achievements;
CREATE POLICY "squad achievements inserted by system" ON squad_achievements
  FOR INSERT WITH CHECK (
    squad_id IN (
      SELECT id FROM squads WHERE leader_id = auth.uid()
    )
  );

-- ── RLS: squad_seasons ────────────────────────────────────────────────────────
ALTER TABLE squad_seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "squad seasons visible to members" ON squad_seasons;
CREATE POLICY "squad seasons visible to members" ON squad_seasons
  FOR SELECT USING (
    squad_id IN (
      SELECT squad_id FROM squad_members
      WHERE user_id = auth.uid() AND removed_at IS NULL
      UNION
      SELECT id FROM squads WHERE leader_id = auth.uid()
    )
  );
