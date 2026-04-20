-- ============================================================
-- NextSplit Onboarding Migration
-- Run in Supabase SQL Editor
-- Session 27 — Sprint 1
-- ============================================================

-- 1. Add new columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS handle               text UNIQUE,
  ADD COLUMN IF NOT EXISTS character_config     jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sport_focus          text[] DEFAULT ARRAY['running'],
  ADD COLUMN IF NOT EXISTS biological_sex       text CHECK (biological_sex IN ('male','female','prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS health_flags         text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS running_experience   text CHECK (running_experience IN ('lt_6mo','6_12mo','1_3yr','3yr_plus')),
  ADD COLUMN IF NOT EXISTS weekly_km_current    numeric(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recent_race_times    jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS longest_recent_run   numeric(5,1),
  ADD COLUMN IF NOT EXISTS run_surfaces         text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS training_days        integer DEFAULT 4,
  ADD COLUMN IF NOT EXISTS preferred_long_run_day text,
  ADD COLUMN IF NOT EXISTS preferred_run_time   text CHECK (preferred_run_time IN ('morning','lunchtime','evening','varies')),
  ADD COLUMN IF NOT EXISTS gym_enabled          boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS gym_sessions_per_week integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS gym_equipment        text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS gym_focus            text CHECK (gym_focus IN ('general','runner_specific','hypertrophy','rehab')),
  ADD COLUMN IF NOT EXISTS onboarding_complete  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step      integer DEFAULT 0;

-- 2. user_goals table
CREATE TABLE IF NOT EXISTS user_goals (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_type       text NOT NULL CHECK (goal_type IN ('race','time_target','distance_milestone','general_fitness','continuous')),
  priority        text NOT NULL DEFAULT 'B' CHECK (priority IN ('A','B','C')),
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  -- Race fields
  race_name       text,
  race_date       date,
  race_distance_km numeric(6,2),
  race_distance_label text,
  -- Target fields
  target_time_secs integer,
  actual_time_secs integer,
  -- Meta
  notes           text,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON user_goals FOR ALL USING (auth.uid() = user_id);
CREATE INDEX user_goals_user ON user_goals(user_id);

-- 3. sport_interest_waitlist
CREATE TABLE IF NOT EXISTS sport_interest_waitlist (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sport      text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, sport)
);
ALTER TABLE sport_interest_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own interests" ON sport_interest_waitlist FOR ALL USING (auth.uid() = user_id);

-- 4. Handle uniqueness index (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_lower ON profiles (lower(handle));
