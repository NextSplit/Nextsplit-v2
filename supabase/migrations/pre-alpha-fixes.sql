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
