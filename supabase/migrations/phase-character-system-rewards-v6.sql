-- phase-character-system-rewards-v6.sql
-- 2026-05-09 — Character system V6 — streak rewards + claim tracking
--
-- Builds on PR #34 (inventory schema + grant_boost / grant_cosmetic).
--
-- Adds:
--   · character_reward_claims tracking table — idempotency for streak,
--     daily-quest, and Stripe-purchase grants. (user, kind, key) PK.
--   · claim_streak_reward(p_user_id, p_streak_days) RPC — service-role.
--     Idempotent per (user, milestone). Called from /api/community/
--     progress after award_session_xp + roll_random_drop. Looks up the
--     highest unclaimed milestone <= current streak and grants the
--     mapped item.
--
-- Stripe purchase grants flow through grant_boost / grant_cosmetic
-- directly from the webhook handler (no new RPC needed) but write a
-- character_reward_claims row with kind='purchase' and key=stripe_session_id
-- for idempotency against duplicate webhooks.
--
-- Daily-quest grants are a separate workstream (DailyQuests system audit
-- needed) — deferred to PR #11. The character_reward_claims table reserves
-- kind='quest' for that future RPC.
--
-- All new RPCs follow F2.4 hardening: SECURITY DEFINER + SET search_path.

BEGIN;

-- ============================================================
-- 1. character_reward_claims — idempotency tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.character_reward_claims (
  user_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_kind        text NOT NULL CHECK (reward_kind IN ('streak','quest','purchase')),
  reward_key         text NOT NULL,
  granted_item_kind  text CHECK (granted_item_kind IN ('boost','cosmetic')),
  granted_item_id    text,
  claimed_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reward_kind, reward_key)
);

ALTER TABLE public.character_reward_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own reward claims read" ON public.character_reward_claims;
CREATE POLICY "Own reward claims read"
  ON public.character_reward_claims
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Writes through SECDEF RPCs / service-role only.

CREATE INDEX IF NOT EXISTS character_reward_claims_user_kind_idx
  ON public.character_reward_claims (user_id, reward_kind);

-- ============================================================
-- 2. RPC: claim_streak_reward(p_user_id, p_streak_days)
-- ============================================================
-- Idempotent per (user, milestone). Returns the granted item or empty if
-- nothing to claim (already claimed for current highest milestone, or
-- streak too short for any milestone).
--
-- Milestone → item mapping (council /council R2 + finance lens):
--    7d  → speed_tonic        (common boost)
--   30d  → banner_streak      (epic cosmetic — matches seed copy)
--   60d  → marathon_focus     (rare boost)
--   90d  → blitz_protocol     (epic boost)
--  180d  → kit_chrome         (legendary cosmetic)
--  365d  → aura_supernova     (legendary cosmetic)
--
-- Mix of boosts + cosmetics so each milestone feels distinct + the player
-- collects across both axes. Cosmetic-only milestones (30/180/365) reward
-- items that gbp_price=null (drops-only) — earning is the canonical path.

CREATE OR REPLACE FUNCTION public.claim_streak_reward(
  p_user_id     uuid,
  p_streak_days int
)
RETURNS TABLE(
  item_kind text,
  item_id   text,
  milestone int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_milestone   int;
  v_reward_key  text;
  v_item_kind   text;
  v_item_id     text;
BEGIN
  -- Highest milestone reached given current streak.
  v_milestone := CASE
    WHEN p_streak_days >= 365 THEN 365
    WHEN p_streak_days >= 180 THEN 180
    WHEN p_streak_days >=  90 THEN  90
    WHEN p_streak_days >=  60 THEN  60
    WHEN p_streak_days >=  30 THEN  30
    WHEN p_streak_days >=   7 THEN   7
    ELSE 0
  END;
  IF v_milestone = 0 THEN RETURN; END IF;

  v_reward_key := 'streak_' || v_milestone::text;

  -- Idempotency: skip if already claimed.
  IF EXISTS (
    SELECT 1 FROM public.character_reward_claims
     WHERE user_id = p_user_id
       AND reward_kind = 'streak'
       AND reward_key = v_reward_key
  ) THEN
    RETURN;
  END IF;

  -- Map milestone → item.
  CASE v_milestone
    WHEN   7 THEN v_item_kind := 'boost';    v_item_id := 'speed_tonic';
    WHEN  30 THEN v_item_kind := 'cosmetic'; v_item_id := 'banner_streak';
    WHEN  60 THEN v_item_kind := 'boost';    v_item_id := 'marathon_focus';
    WHEN  90 THEN v_item_kind := 'boost';    v_item_id := 'blitz_protocol';
    WHEN 180 THEN v_item_kind := 'cosmetic'; v_item_id := 'kit_chrome';
    WHEN 365 THEN v_item_kind := 'cosmetic'; v_item_id := 'aura_supernova';
  END CASE;

  -- Grant + record claim.
  IF v_item_kind = 'boost' THEN
    PERFORM public.grant_boost(p_user_id, v_item_id, 1);
  ELSE
    PERFORM public.grant_cosmetic(p_user_id, v_item_id);
  END IF;

  INSERT INTO public.character_reward_claims (user_id, reward_kind, reward_key, granted_item_kind, granted_item_id)
  VALUES (p_user_id, 'streak', v_reward_key, v_item_kind, v_item_id);

  item_kind := v_item_kind;
  item_id   := v_item_id;
  milestone := v_milestone;
  RETURN NEXT;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.claim_streak_reward(uuid, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_streak_reward(uuid, int) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_streak_reward(uuid, int) FROM anon;
GRANT  EXECUTE ON FUNCTION public.claim_streak_reward(uuid, int) TO service_role;

-- ============================================================
-- 3. RPC: record_purchase_grant — service-role; idempotent per session
-- ============================================================
-- Called from the Stripe webhook after a successful checkout with
-- source='character_inventory'. Grants the item AND records the claim
-- under (user_id, 'purchase', stripe_session_id) so duplicate webhook
-- deliveries don't double-grant.

CREATE OR REPLACE FUNCTION public.record_purchase_grant(
  p_user_id            uuid,
  p_stripe_session_id  text,
  p_item_kind          text,
  p_item_id            text
)
RETURNS boolean -- true if granted; false if already claimed (idempotent)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_existed boolean;
BEGIN
  IF p_item_kind NOT IN ('boost','cosmetic') THEN
    RAISE EXCEPTION 'invalid item_kind: %', p_item_kind USING ERRCODE = '22023';
  END IF;

  v_existed := EXISTS (
    SELECT 1 FROM public.character_reward_claims
     WHERE user_id = p_user_id
       AND reward_kind = 'purchase'
       AND reward_key = p_stripe_session_id
  );
  IF v_existed THEN RETURN false; END IF;

  IF p_item_kind = 'boost' THEN
    PERFORM public.grant_boost(p_user_id, p_item_id, 1);
  ELSE
    PERFORM public.grant_cosmetic(p_user_id, p_item_id);
  END IF;

  INSERT INTO public.character_reward_claims (user_id, reward_kind, reward_key, granted_item_kind, granted_item_id)
  VALUES (p_user_id, 'purchase', p_stripe_session_id, p_item_kind, p_item_id);

  RETURN true;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.record_purchase_grant(uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_purchase_grant(uuid, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.record_purchase_grant(uuid, text, text, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.record_purchase_grant(uuid, text, text, text) TO service_role;

COMMIT;
