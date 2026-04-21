-- ─── Runner Class System Migration ────────────────────────────────────────────
-- Run this in Supabase SQL editor
-- Adds runner_class and runner_class_updated_at to profiles
-- Also adds first_session_logged_at for the 4-week reveal window tracking

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS runner_class TEXT DEFAULT 'warming_up'
    CHECK (runner_class IN ('warming_up','marathon_runner','speed_merchant','trail_blazer','base_builder','all_rounder','comeback_runner')),
  ADD COLUMN IF NOT EXISTS runner_class_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_session_logged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS runner_class_revealed BOOLEAN DEFAULT FALSE;

-- Index for coach squad dashboard queries (athlete classes)
CREATE INDEX IF NOT EXISTS idx_profiles_runner_class ON profiles(runner_class);

-- After running this, regenerate types:
-- npx supabase gen types typescript --project-id YOUR_ID > src/types/database.ts
