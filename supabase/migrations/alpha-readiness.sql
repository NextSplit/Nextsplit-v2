-- ─── NextSplit — Alpha Readiness SQL Migration ──────────────────────────────
-- Run this ONCE in Supabase SQL Editor before alpha invites go out.
-- All statements use IF NOT EXISTS / IF EXISTS — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Referral + notification columns on profiles ────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_reward_given_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lifecycle_email_sent TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_notification_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS at_risk_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notif_session_reminder BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_adaptation_alert BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_weekly_recap BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_race_countdown BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_streak_at_risk BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_coach_message BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_at_risk_reengagement BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_class_revealed BOOLEAN DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_idx ON profiles(referral_code);

-- ── 2. Runner class columns on profiles ──────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS runner_class TEXT DEFAULT 'warming_up'
    CHECK (runner_class IN ('warming_up','marathon_runner','speed_merchant','trail_blazer','base_builder','all_rounder','comeback_runner')),
  ADD COLUMN IF NOT EXISTS runner_class_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_session_logged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS runner_class_revealed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS season_xp INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_league TEXT DEFAULT 'bronze';

CREATE INDEX IF NOT EXISTS idx_profiles_runner_class ON profiles(runner_class);

-- ── 3. club_feed — add missing columns for Phase E ───────────────────────────

ALTER TABLE club_feed
  ADD COLUMN IF NOT EXISTS milestone_type TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Rename logged_at → created_at if needed (safe either way due to IF NOT EXISTS above)

-- ── 4. club_feed_reactions — new table for Phase E feed reactions ─────────────

CREATE TABLE IF NOT EXISTS club_feed_reactions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_item_id uuid REFERENCES club_feed(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction     text NOT NULL CHECK (reaction IN ('🔥', '👏', '💪', '🏃')),
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE (feed_item_id, user_id)
);

ALTER TABLE club_feed_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can react" ON club_feed_reactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Club members can read reactions" ON club_feed_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_feed cf
      JOIN club_members cm ON cm.club_id = cf.club_id
      WHERE cf.id = club_feed_reactions.feed_item_id
        AND cm.user_id = auth.uid()
    )
  );

-- ── 5. club_members — add share_feed preference ───────────────────────────────

ALTER TABLE club_members
  ADD COLUMN IF NOT EXISTS share_feed BOOLEAN DEFAULT true;

-- ── 6. Activity logs (non-running sports) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_logs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('swim', 'cycle', 'walk', 'hike', 'yoga', 'other')),
  logged_at     date NOT NULL DEFAULT CURRENT_DATE,
  duration_secs integer,
  distance_km   numeric(6,2),
  calories      integer,
  effort        integer CHECK (effort BETWEEN 1 AND 10),
  notes         text,
  strava_id     bigint,
  created_at    timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own activity logs" ON activity_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS activity_logs_user_date ON activity_logs(user_id, logged_at DESC);

-- ── 7. NPS responses table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nps_responses (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score      integer NOT NULL CHECK (score BETWEEN 0 AND 10),
  trigger    text NOT NULL CHECK (trigger IN ('day_7', 'day_30')),
  comment    text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own NPS responses" ON nps_responses
  FOR ALL USING (auth.uid() = user_id);

-- Admins can read all NPS for dashboard
CREATE POLICY "Service role reads all NPS" ON nps_responses
  FOR SELECT USING (true);

-- ── 8. Helper RPC functions ───────────────────────────────────────────────────

-- Increment season XP (called after each session)
CREATE OR REPLACE FUNCTION increment_season_xp(p_user_id uuid, p_xp integer)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET season_xp = COALESCE(season_xp, 0) + p_xp
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment profile XP (challenge completion)
CREATE OR REPLACE FUNCTION increment_profile_xp(p_user_id uuid, p_xp integer, p_season_xp integer DEFAULT 0)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET season_xp = COALESCE(season_xp, 0) + p_season_xp
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement club member count (called on leave)
CREATE OR REPLACE FUNCTION decrement_club_members(p_club_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE clubs
  SET member_count = GREATEST(0, COALESCE(member_count, 0) - 1)
  WHERE id = p_club_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Done ─────────────────────────────────────────────────────────────────────

-- Verify by running:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY column_name;
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
