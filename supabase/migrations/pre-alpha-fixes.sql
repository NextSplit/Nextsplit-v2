-- Pre-alpha safety migrations
-- Run these in Supabase SQL editor before first alpha invite

-- Add missing notification preference column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notif_at_risk_reengagement boolean DEFAULT true;

-- Ensure at_risk_sent_at column exists (for email deduplication)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS at_risk_sent_at timestamptz;

-- Index on last_notification_at for cron query performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_notification 
ON profiles (last_notification_at);

-- Index on notifications_enabled for cron filtering
CREATE INDEX IF NOT EXISTS idx_profiles_notif_enabled 
ON profiles (notifications_enabled) WHERE notifications_enabled = true;

-- AI usage tracking table (required for rate limiting)
CREATE TABLE IF NOT EXISTS ai_usage (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users NOT NULL,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  call_count  integer NOT NULL DEFAULT 0,
  tokens_in   integer NOT NULL DEFAULT 0,
  tokens_out  integer NOT NULL DEFAULT 0,
  feature     text DEFAULT 'daily_coach',
  UNIQUE (user_id, date)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users read own ai_usage" 
ON ai_usage FOR SELECT USING (auth.uid() = user_id);

-- Index for rate limit queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date 
ON ai_usage (user_id, date);
