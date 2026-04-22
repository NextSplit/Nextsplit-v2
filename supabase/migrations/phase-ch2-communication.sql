-- ─── Phase CH2 — Coach Hub Communication ─────────────────────────────────────
-- Scheduled messages, message reactions, read receipts, email digest prefs, Coach Pro

-- ── coach_messages extensions ─────────────────────────────────────────────────
-- Add scheduled_at and reaction fields if not already present
ALTER TABLE coach_messages
  ADD COLUMN IF NOT EXISTS scheduled_at    timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at         timestamptz,
  ADD COLUMN IF NOT EXISTS is_scheduled    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reaction        text,
  ADD COLUMN IF NOT EXISTS reaction_at     timestamptz,
  ADD COLUMN IF NOT EXISTS read_at         timestamptz,
  ADD COLUMN IF NOT EXISTS message_type    text DEFAULT 'text'
    CHECK (message_type IN ('text', 'voice', 'scheduled', 'milestone'));

-- ── Coach Pro fields on coach_profiles ────────────────────────────────────────
ALTER TABLE coach_profiles
  ADD COLUMN IF NOT EXISTS is_coach_pro          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_pro_expires_at   timestamptz,
  ADD COLUMN IF NOT EXISTS coach_pro_stripe_sub_id text,
  ADD COLUMN IF NOT EXISTS digest_preference      text DEFAULT 'daily'
    CHECK (digest_preference IN ('immediate', 'daily', 'weekly')),
  ADD COLUMN IF NOT EXISTS digest_time_utc        integer DEFAULT 8, -- hour 0-23
  ADD COLUMN IF NOT EXISTS referral_code          text UNIQUE;

-- ── Coach referrals ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_referrals (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code     text NOT NULL,
  status            text DEFAULT 'pending'
    CHECK (status IN ('pending', 'signed_up', 'paying', 'rewarded')),
  reward_paid_at    timestamptz,
  reward_amount_gbp numeric(8,2) DEFAULT 100,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE coach_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coaches see own referrals" ON coach_referrals;
CREATE POLICY "coaches see own referrals" ON coach_referrals
  FOR SELECT USING (referrer_id = auth.uid());

-- ── Scheduled message count constraint (enforced in app, not DB) ──────────────
-- Max 10 scheduled messages per athlete: checked in API

-- ── Generate referral code for coaches ───────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_coach_referral_code(p_coach_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
BEGIN
  -- Generate a short unique code: COACH- + 6 chars
  v_code := 'COACH-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  UPDATE coach_profiles
  SET referral_code = v_code
  WHERE user_id = p_coach_id AND referral_code IS NULL;

  RETURN v_code;
END;
$$;
