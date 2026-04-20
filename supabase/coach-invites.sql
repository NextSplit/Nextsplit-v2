-- Coach invites table (replaces placeholder hack in coach_athletes)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS coach_invites (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id     uuid REFERENCES coach_profiles(user_id) ON DELETE CASCADE NOT NULL,
  token        text UNIQUE NOT NULL,
  athlete_goal text,
  coach_notes  text,
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  used_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE coach_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages own invites" ON coach_invites FOR ALL USING (auth.uid() = coach_id);
CREATE POLICY "Public reads invite by token" ON coach_invites FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS coach_invites_token ON coach_invites(token);
CREATE INDEX IF NOT EXISTS coach_invites_coach ON coach_invites(coach_id);

-- Clean up old placeholder rows in coach_athletes where athlete_id = coach_id
DELETE FROM coach_athletes WHERE athlete_id = coach_id AND status = 'pending';
