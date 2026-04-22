-- ─── Phase SL1: Split Leader Foundation ────────────────────────────────────
-- Run in Supabase SQL Editor before Phase SL1 UI build
-- All statements use IF NOT EXISTS — safe to re-run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Squads ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS squads (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            text NOT NULL CHECK (length(trim(name)) >= 2 AND length(name) <= 30),
  slug            text UNIQUE NOT NULL,
  logo_url        text,
  colour          text DEFAULT '#c49a3c', -- Track gold (Split Leader colour)
  welcome_msg     text CHECK (length(welcome_msg) <= 200),
  is_public       boolean DEFAULT false,
  -- Monthly goal (resets each month)
  goal_type       text CHECK (goal_type IN ('km', 'sessions')),
  goal_value      integer,
  goal_month      text, -- YYYY-MM format, e.g. '2026-04'
  -- Disbanding
  disbanded_at    timestamptz,
  disband_reason  text CHECK (disband_reason IN ('leader_inactive', 'leader_disbanded', 'admin')),
  -- Inactivity tracking
  last_activity_at timestamptz DEFAULT now(),
  inactivity_warning_sent_at timestamptz,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE squads ENABLE ROW LEVEL SECURITY;

-- Leader can manage their squad
CREATE POLICY "Leader manages own squad" ON squads
  FOR ALL USING (auth.uid() = leader_id);

-- Members can read their squad
CREATE POLICY "Squad members can read" ON squads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_id = squads.id AND user_id = auth.uid()
    )
  );

-- Public squads readable by all (for invite landing pages)
CREATE POLICY "Public squads readable" ON squads
  FOR SELECT USING (is_public = true);

CREATE INDEX IF NOT EXISTS squads_leader_id ON squads(leader_id);
CREATE INDEX IF NOT EXISTS squads_slug ON squads(slug);

-- ── 2. Squad Members ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS squad_members (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id              uuid REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at             timestamptz DEFAULT now() NOT NULL,
  invited_by            uuid REFERENCES auth.users(id),
  invite_code           text, -- which invite code they used (for referral tracking)
  converted_via_invite  boolean DEFAULT false, -- upgraded to Premium via squad invite
  is_premium_at_join    boolean DEFAULT false, -- were they Premium when they joined?
  last_active_at        timestamptz DEFAULT now(),
  removed_at            timestamptz, -- soft delete (leader removed them)
  removed_by            uuid REFERENCES auth.users(id),
  UNIQUE (squad_id, user_id)
);

ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;

-- Members can read all members in their squads
CREATE POLICY "Squad members read all in squad" ON squad_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM squad_members sm2
      WHERE sm2.squad_id = squad_members.squad_id
        AND sm2.user_id = auth.uid()
        AND sm2.removed_at IS NULL
    )
  );

-- Leader can manage members
CREATE POLICY "Leader manages squad members" ON squad_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM squads
      WHERE squads.id = squad_members.squad_id
        AND squads.leader_id = auth.uid()
    )
  );

-- Users can manage their own membership (leave squad)
CREATE POLICY "Users manage own membership" ON squad_members
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS squad_members_squad_id ON squad_members(squad_id);
CREATE INDEX IF NOT EXISTS squad_members_user_id ON squad_members(user_id);
CREATE INDEX IF NOT EXISTS squad_members_active ON squad_members(squad_id, removed_at)
  WHERE removed_at IS NULL;

-- ── 3. Squad Invites ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS squad_invites (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id   uuid REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  code       text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  uses       integer DEFAULT 0,
  max_uses   integer, -- null = unlimited
  expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE squad_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can read an invite code (needed for landing page)
CREATE POLICY "Invite codes publicly readable" ON squad_invites
  FOR SELECT USING (
    (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR uses < max_uses)
  );

-- Leader can manage invites
CREATE POLICY "Leader manages invites" ON squad_invites
  FOR ALL USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS squad_invites_code ON squad_invites(code);
CREATE INDEX IF NOT EXISTS squad_invites_squad_id ON squad_invites(squad_id);

-- ── 4. Squad Nudges ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS squad_nudges (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id    uuid REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  from_user   uuid REFERENCES auth.users(id) NOT NULL,
  to_user     uuid REFERENCES auth.users(id) NOT NULL,
  message_key text NOT NULL, -- references curated message list
  sent_at     timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE squad_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can send nudges" ON squad_nudges
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM squads
      WHERE squads.id = squad_nudges.squad_id
        AND squads.leader_id = auth.uid()
    )
  );

CREATE POLICY "Users see nudges sent to them" ON squad_nudges
  FOR SELECT USING (auth.uid() = to_user OR auth.uid() = from_user);

-- Index for rate limiting (1 nudge per member per day)
CREATE INDEX IF NOT EXISTS squad_nudges_rate_limit
  ON squad_nudges(from_user, to_user, sent_at DESC);

-- ── 5. Squad Feed (milestone posts) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS squad_feed (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id       uuid REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  milestone_type text NOT NULL CHECK (milestone_type IN (
    'plan_complete', 'race_result', 'distance_pb', 'streak_milestone',
    'squad_goal_reached', 'first_run', 'joined_squad'
  )),
  -- Milestone context
  value_km       numeric(8,2),  -- for distance milestones
  value_secs     integer,       -- for race result (finish time)
  value_streak   integer,       -- for streak milestones
  value_text     text,          -- for descriptive milestones
  created_at     timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE squad_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members read feed" ON squad_feed
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_id = squad_feed.squad_id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM squads
      WHERE id = squad_feed.squad_id AND leader_id = auth.uid()
    )
  );

CREATE POLICY "System inserts feed posts" ON squad_feed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS squad_feed_squad ON squad_feed(squad_id, created_at DESC);

-- ── 6. Squad Feed Reactions ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS squad_feed_reactions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_item_id uuid REFERENCES squad_feed(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction     text NOT NULL CHECK (reaction IN ('🔥', '👏', '💪', '🎉', '❤️')),
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE (feed_item_id, user_id)
);

ALTER TABLE squad_feed_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members react" ON squad_feed_reactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Squad members read reactions" ON squad_feed_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM squad_feed sf
      JOIN squad_members sm ON sm.squad_id = sf.squad_id
      WHERE sf.id = squad_feed_reactions.feed_item_id
        AND sm.user_id = auth.uid()
        AND sm.removed_at IS NULL
    )
  );

-- ── 7. Squad Achievements ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS squad_achievements (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id     uuid REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  type         text NOT NULL,
  earned_at    timestamptz DEFAULT now() NOT NULL,
  season_type  text NOT NULL CHECK (season_type IN ('month', 'year', 'lifetime')),
  season_period text NOT NULL, -- '2026-04' or '2026' or 'all'
  metadata     jsonb DEFAULT '{}'
);

ALTER TABLE squad_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members read achievements" ON squad_achievements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_id = squad_achievements.squad_id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM squads
      WHERE id = squad_achievements.squad_id AND leader_id = auth.uid()
    )
  );

-- ── 8. Squad Seasons (snapshot at end of each period) ─────────────────────────

CREATE TABLE IF NOT EXISTS squad_seasons (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id        uuid REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  season_type     text NOT NULL CHECK (season_type IN ('month', 'year', 'lifetime')),
  period          text NOT NULL, -- '2026-04', '2026', or 'all'
  total_km        numeric(10,2) DEFAULT 0,
  total_sessions  integer DEFAULT 0,
  active_members  integer DEFAULT 0,
  goal_hit        boolean DEFAULT false,
  goal_type       text,
  goal_value      integer,
  top_runner_id   uuid REFERENCES auth.users(id),
  top_runner_km   numeric(8,2),
  created_at      timestamptz DEFAULT now() NOT NULL,
  UNIQUE (squad_id, season_type, period)
);

ALTER TABLE squad_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members read seasons" ON squad_seasons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_id = squad_seasons.squad_id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM squads
      WHERE id = squad_seasons.squad_id AND leader_id = auth.uid()
    )
  );

-- ── 9. Profiles additions for Split Leader ────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_split_leader boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS split_leader_squad_id uuid REFERENCES squads(id),
  ADD COLUMN IF NOT EXISTS split_leader_reward_months integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS split_leader_reward_weeks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS split_leader_total_conversions integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS profiles_split_leaders ON profiles(is_split_leader)
  WHERE is_split_leader = true;

-- ── 10. RPC Functions ─────────────────────────────────────────────────────────

-- Get active member count for a squad
CREATE OR REPLACE FUNCTION squad_active_member_count(p_squad_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM squad_members
  WHERE squad_id = p_squad_id AND removed_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get squad collective km for current month
CREATE OR REPLACE FUNCTION squad_monthly_km(p_squad_id uuid, p_month text DEFAULT NULL)
RETURNS numeric AS $$
DECLARE
  v_month text := COALESCE(p_month, to_char(now(), 'YYYY-MM'));
  v_start date := (v_month || '-01')::date;
  v_end   date := (v_start + interval '1 month')::date;
BEGIN
  RETURN (
    SELECT COALESCE(SUM(tl.km), 0)
    FROM training_logs tl
    JOIN squad_members sm ON sm.user_id = tl.user_id
    WHERE sm.squad_id = p_squad_id
      AND sm.removed_at IS NULL
      AND tl.done = true
      AND tl.logged_at >= v_start
      AND tl.logged_at < v_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check nudge rate limit (1 per member per day)
CREATE OR REPLACE FUNCTION can_nudge(p_from uuid, p_to uuid)
RETURNS boolean AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM squad_nudges
    WHERE from_user = p_from
      AND to_user = p_to
      AND sent_at > now() - interval '24 hours'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Apply referral reward to leader
CREATE OR REPLACE FUNCTION apply_split_leader_reward(p_leader_id uuid, p_type text DEFAULT 'month')
RETURNS void AS $$
BEGIN
  IF p_type = 'month' THEN
    UPDATE profiles
    SET split_leader_reward_months = split_leader_reward_months + 1,
        split_leader_total_conversions = split_leader_total_conversions + 1
    WHERE id = p_leader_id;
  ELSIF p_type = 'week' THEN
    UPDATE profiles
    SET split_leader_reward_weeks = split_leader_reward_weeks + 1
    WHERE id = p_leader_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Done ──────────────────────────────────────────────────────────────────────

-- Verification query:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE 'squad%'
-- ORDER BY table_name;
-- Expected: squad_achievements, squad_feed, squad_feed_reactions,
--           squad_invites, squad_members, squad_nudges, squad_seasons, squads
