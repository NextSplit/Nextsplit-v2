-- ─── Phase CM2 — Coaching Revenue ────────────────────────────────────────────
-- Coaching subscriptions, earnings ledger, disputes, group coaching
-- Run after: phase-cm1-marketplace.sql

-- ── Coaching subscriptions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coaching_subscriptions (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id              uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  athlete_id            uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text UNIQUE,
  stripe_payment_intent_id text,
  status                text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','cancelled','paused','dispute','refunded')),
  amount_gbp            numeric(8,2) NOT NULL,
  commission_rate       numeric(5,4) NOT NULL, -- e.g. 0.15 for 15%
  commission_gbp        numeric(8,2) NOT NULL,
  coach_payout_gbp      numeric(8,2) NOT NULL,
  billing_interval      text DEFAULT 'month' CHECK (billing_interval IN ('month','year')),
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancelled_at          timestamptz,
  dispute_opened_at     timestamptz,
  dispute_reason        text,
  dispute_resolved_at   timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE (coach_id, athlete_id)
);

ALTER TABLE coaching_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coaches see own subscriptions" ON coaching_subscriptions;
CREATE POLICY "coaches see own subscriptions" ON coaching_subscriptions
  FOR SELECT USING (coach_id = auth.uid() OR athlete_id = auth.uid());

DROP POLICY IF EXISTS "athletes create subscriptions" ON coaching_subscriptions;
CREATE POLICY "athletes create subscriptions" ON coaching_subscriptions
  FOR INSERT WITH CHECK (athlete_id = auth.uid());

DROP POLICY IF EXISTS "athletes update own subscriptions" ON coaching_subscriptions;
CREATE POLICY "athletes update own subscriptions" ON coaching_subscriptions
  FOR UPDATE USING (athlete_id = auth.uid() OR coach_id = auth.uid());

-- ── Coach earnings ledger ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_earnings (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  athlete_id        uuid REFERENCES auth.users(id),
  source_type       text NOT NULL CHECK (source_type IN ('subscription','plan_sale','group_coaching')),
  source_id         uuid, -- coaching_subscription.id or plan_purchases.id
  gross_gbp         numeric(8,2) NOT NULL,
  commission_rate   numeric(5,4) NOT NULL,
  commission_gbp    numeric(8,2) NOT NULL,
  net_gbp           numeric(8,2) NOT NULL,
  period_month      text NOT NULL, -- YYYY-MM
  stripe_transfer_id text,
  paid_out          boolean DEFAULT false,
  paid_out_at       timestamptz,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE coach_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coaches see own earnings" ON coach_earnings;
CREATE POLICY "coaches see own earnings" ON coach_earnings
  FOR SELECT USING (coach_id = auth.uid());

-- ── Group coaching sessions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_coaching_sessions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            text NOT NULL,
  description     text,
  template_id     uuid, -- links to plan_templates
  start_date      date NOT NULL,
  max_participants integer DEFAULT 10,
  price_gbp       numeric(8,2) NOT NULL,
  status          text DEFAULT 'open' CHECK (status IN ('open','full','started','completed','cancelled')),
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE group_coaching_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group sessions readable by all" ON group_coaching_sessions;
CREATE POLICY "group sessions readable by all" ON group_coaching_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "coaches manage own sessions" ON group_coaching_sessions;
CREATE POLICY "coaches manage own sessions" ON group_coaching_sessions
  FOR ALL USING (coach_id = auth.uid());

-- ── Group coaching enrolments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_coaching_enrolments (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      uuid REFERENCES group_coaching_sessions(id) ON DELETE CASCADE NOT NULL,
  athlete_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id text,
  amount_gbp      numeric(8,2) NOT NULL,
  status          text DEFAULT 'active' CHECK (status IN ('active','cancelled','refunded')),
  enrolled_at     timestamptz DEFAULT now(),
  UNIQUE (session_id, athlete_id)
);

ALTER TABLE group_coaching_enrolments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "athletes see own enrolments" ON group_coaching_enrolments;
CREATE POLICY "athletes see own enrolments" ON group_coaching_enrolments
  FOR SELECT USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "coaches see session enrolments" ON group_coaching_enrolments;
CREATE POLICY "coaches see session enrolments" ON group_coaching_enrolments
  FOR SELECT USING (
    session_id IN (SELECT id FROM group_coaching_sessions WHERE coach_id = auth.uid())
  );

-- ── RPC: commission rate for a coach based on client count ────────────────────
CREATE OR REPLACE FUNCTION get_commission_rate(p_coach_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN COUNT(*) >= 50 THEN 0.08
    WHEN COUNT(*) >= 25 THEN 0.10
    WHEN COUNT(*) >= 10 THEN 0.12
    ELSE 0.15
  END
  FROM coaching_subscriptions
  WHERE coach_id = p_coach_id
    AND status = 'active';
$$;

-- ── RPC: coach monthly earnings summary ───────────────────────────────────────
CREATE OR REPLACE FUNCTION coach_earnings_summary(p_coach_id uuid)
RETURNS TABLE (
  period_month  text,
  gross_gbp     numeric,
  commission_gbp numeric,
  net_gbp       numeric,
  source_count  bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    period_month,
    SUM(gross_gbp)      AS gross_gbp,
    SUM(commission_gbp) AS commission_gbp,
    SUM(net_gbp)        AS net_gbp,
    COUNT(*)            AS source_count
  FROM coach_earnings
  WHERE coach_id = p_coach_id
  GROUP BY period_month
  ORDER BY period_month DESC;
$$;

-- ── RPC: coach YTD earnings ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION coach_earnings_ytd(p_coach_id uuid)
RETURNS TABLE (
  gross_gbp      numeric,
  commission_gbp numeric,
  net_gbp        numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(SUM(gross_gbp), 0),
    COALESCE(SUM(commission_gbp), 0),
    COALESCE(SUM(net_gbp), 0)
  FROM coach_earnings
  WHERE coach_id = p_coach_id
    AND period_month >= to_char(date_trunc('year', now()), 'YYYY-MM');
$$;
