-- Phase 12: Referral Programme
-- Run in Supabase SQL editor before deploying Phase 12

-- Referral columns on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_reward_given_at TIMESTAMPTZ;

-- Index for fast code lookups
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_idx ON profiles(referral_code);

-- Phase 6 notification preferences (run if not already done)
ALTER TABLE profiles
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
