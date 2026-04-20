-- ============================================================
-- Community: Clubs, Seasons, Challenges, Virtual Races
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Seasons
CREATE TABLE IF NOT EXISTS seasons (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  number      integer NOT NULL UNIQUE,
  name        text NOT NULL,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  is_active   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads seasons" ON seasons FOR SELECT USING (true);

-- Seed Season 1
INSERT INTO seasons (number, name, starts_at, ends_at, is_active)
VALUES (1, 'Season 1', now(), now() + interval '30 days', true)
ON CONFLICT (number) DO NOTHING;

-- 2. Clubs
CREATE TABLE IF NOT EXISTS clubs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  description   text,
  emoji         text DEFAULT '🏃',
  is_public     boolean DEFAULT true,
  join_code     text UNIQUE NOT NULL,
  owner_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coach_id      uuid REFERENCES coach_profiles(user_id) ON DELETE SET NULL,
  member_count  integer DEFAULT 1,
  weekly_km     numeric(10,2) DEFAULT 0,
  total_km      numeric(10,2) DEFAULT 0,
  created_at    timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads public clubs" ON clubs FOR SELECT USING (is_public = true OR EXISTS (
  SELECT 1 FROM club_members WHERE club_id = clubs.id AND user_id = auth.uid()
));
CREATE POLICY "Owner manages club" ON clubs FOR ALL USING (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS clubs_slug ON clubs(slug);
CREATE INDEX IF NOT EXISTS clubs_join_code ON clubs(join_code);

-- 3. Club members
CREATE TABLE IF NOT EXISTS club_members (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role        text DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  share_feed  boolean DEFAULT true,
  weekly_km   numeric(10,2) DEFAULT 0,
  season_xp   integer DEFAULT 0,
  total_km    numeric(10,2) DEFAULT 0,
  joined_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE(club_id, user_id)
);
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read club membership" ON club_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_members.club_id AND cm.user_id = auth.uid())
);
CREATE POLICY "User manages own membership" ON club_members FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS club_members_club ON club_members(club_id);
CREATE INDEX IF NOT EXISTS club_members_user ON club_members(user_id);

-- 4. Club feed (shared sessions)
CREATE TABLE IF NOT EXISTS club_feed (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id       uuid REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_type  text NOT NULL,
  session_name  text NOT NULL,
  km            numeric(8,2),
  duration_secs integer,
  pace          text,
  effort        integer,
  note          text,
  reactions     jsonb DEFAULT '{}',
  logged_at     timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE club_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members read feed" ON club_feed FOR SELECT USING (
  EXISTS (SELECT 1 FROM club_members WHERE club_id = club_feed.club_id AND user_id = auth.uid())
);
CREATE POLICY "User manages own feed posts" ON club_feed FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS club_feed_club ON club_feed(club_id, logged_at DESC);

-- 5. Challenges
CREATE TABLE IF NOT EXISTS challenges (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title         text NOT NULL,
  description   text,
  challenge_type text NOT NULL CHECK (challenge_type IN ('distance','sessions','streak','time')),
  target_value  numeric(10,2) NOT NULL,
  target_unit   text NOT NULL,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  reward_xp     integer DEFAULT 500,
  reward_badge  text,
  reward_title  text,
  club_id       uuid REFERENCES clubs(id) ON DELETE CASCADE,
  creator_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_global     boolean DEFAULT false,
  entry_count   integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads challenges" ON challenges FOR SELECT USING (true);

-- 6. Challenge entries
CREATE TABLE IF NOT EXISTS challenge_entries (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  progress     numeric(10,2) DEFAULT 0,
  completed    boolean DEFAULT false,
  completed_at timestamptz,
  joined_at    timestamptz DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);
ALTER TABLE challenge_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own entries" ON challenge_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public reads entries" ON challenge_entries FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS challenge_entries_challenge ON challenge_entries(challenge_id);

-- 7. Virtual races
CREATE TABLE IF NOT EXISTS virtual_races (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL,
  description   text,
  distance_km   numeric(8,2) NOT NULL,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  entry_fee_gbp numeric(8,2) DEFAULT 0,
  max_entries   integer,
  prize_pool    text,
  finisher_cert boolean DEFAULT true,
  entry_count   integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE virtual_races ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads virtual races" ON virtual_races FOR SELECT USING (true);

-- 8. Virtual race entries
CREATE TABLE IF NOT EXISTS virtual_race_entries (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  race_id     uuid REFERENCES virtual_races(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  finish_time_secs integer,
  pace        text,
  position    integer,
  dns         boolean DEFAULT false,
  submitted_at timestamptz,
  joined_at   timestamptz DEFAULT now(),
  UNIQUE(race_id, user_id)
);
ALTER TABLE virtual_race_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own race entries" ON virtual_race_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public reads race entries" ON virtual_race_entries FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS virtual_race_entries_race ON virtual_race_entries(race_id, finish_time_secs ASC);

-- 9. Add season/community cols to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS current_league  text DEFAULT 'bronze' CHECK (current_league IN ('bronze','silver','gold','platinum','elite')),
  ADD COLUMN IF NOT EXISTS season_xp       integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_club_km   numeric(10,2) DEFAULT 0;

-- 10. Seed global challenge
INSERT INTO challenges (title, description, challenge_type, target_value, target_unit, starts_at, ends_at, reward_xp, is_global)
VALUES (
  'First Steps',
  'Log your first 3 sessions on NextSplit',
  'sessions', 3, 'sessions',
  now(), now() + interval '365 days', 200, true
) ON CONFLICT DO NOTHING;

-- Helper RPCs for community progress
CREATE OR REPLACE FUNCTION increment_season_xp(p_user_id uuid, p_xp integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET season_xp = COALESCE(season_xp, 0) + p_xp WHERE id = p_user_id;
  -- Auto-promote league based on season XP
  UPDATE profiles SET current_league = CASE
    WHEN season_xp >= 6000 THEN 'elite'
    WHEN season_xp >= 3000 THEN 'platinum'
    WHEN season_xp >= 1500 THEN 'gold'
    WHEN season_xp >= 500  THEN 'silver'
    ELSE 'bronze'
  END WHERE id = p_user_id;
END; $$;

CREATE OR REPLACE FUNCTION increment_profile_xp(p_user_id uuid, p_xp integer, p_season_xp integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET
    xp         = COALESCE(xp, 0) + p_xp,
    season_xp  = COALESCE(season_xp, 0) + p_season_xp
  WHERE id = p_user_id;
END; $$;

-- Weekly reset function (call via cron or manually each Monday)
CREATE OR REPLACE FUNCTION reset_weekly_club_km()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE clubs SET weekly_km = 0;
  UPDATE club_members SET weekly_km = 0;
END; $$;

-- Season reset (run at end of each season)
CREATE OR REPLACE FUNCTION reset_season()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET season_xp = 0;
  UPDATE club_members SET season_xp = 0;
  UPDATE seasons SET is_active = false WHERE is_active = true;
END; $$;
