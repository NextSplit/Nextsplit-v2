-- ============================================================
-- Stripe / subscription migration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add Stripe columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_pro                boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pro_expires_at        timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id    text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_price_id       text,
  ADD COLUMN IF NOT EXISTS subscription_status   text DEFAULT 'free'
    CHECK (subscription_status IN ('free','trialing','active','past_due','canceled','founding'));

-- 2. Founding member counter
CREATE TABLE IF NOT EXISTS app_config (
  key   text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
INSERT INTO app_config (key, value)
  VALUES ('founding_member_count', '0')
  ON CONFLICT (key) DO NOTHING;

-- RLS — only service role can write, anyone can read
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads config" ON app_config FOR SELECT USING (true);

-- 3. Index for Stripe lookups
CREATE INDEX IF NOT EXISTS profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS profiles_stripe_sub      ON profiles(stripe_subscription_id);
