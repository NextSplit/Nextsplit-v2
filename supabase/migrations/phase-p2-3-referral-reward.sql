-- ─── Phase P2.3: Referral reward trigger ───────────────────────────────────
-- Source: docs/ROADMAP.md §6 P2.3.
--
-- Adds the missing piece of the referral loop: when a referred user logs
-- their 5th session, both they and their referrer earn one month of Elite.
-- Until paywall flip (P4), the credit is informational — counted in
-- profiles.referral_reward_months for later redemption.
--
-- Idempotent: safe to re-run.

BEGIN;

-- 1. Counter column on profiles (referrer_reward_given_at already exists
--    from phase-12-referral.sql; that's the per-user-once gate).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_reward_months integer NOT NULL DEFAULT 0;

-- 2. RPC: credit the referral reward if eligible. Called from the client-
--    side useSessionLogging hook after every log save. Returns:
--      { ok: true,  credited_to_user: <uuid>, credited_to_referrer: <uuid> }
--      { ok: false, reason: 'not_authenticated' | 'not_referred' |
--                            'already_credited' | 'below_threshold', count: <int> }
--    Idempotent: subsequent calls after the threshold has been crossed
--    return ok=false / already_credited (the per-user gate via
--    referral_reward_given_at IS NOT NULL).
CREATE OR REPLACE FUNCTION public.credit_referral_reward_if_eligible()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller     uuid := auth.uid();
  v_referrer   uuid;
  v_already    timestamptz;
  v_count      integer;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT referred_by, referral_reward_given_at
    INTO v_referrer, v_already
    FROM public.profiles
   WHERE id = v_caller;

  IF v_referrer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_referred');
  END IF;

  IF v_already IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_credited');
  END IF;

  SELECT count(*) INTO v_count
    FROM public.training_logs
   WHERE user_id = v_caller AND done = true;

  IF v_count < 5 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'below_threshold', 'count', v_count);
  END IF;

  -- Credit the referred user (caller) — one Elite month + mark as given.
  UPDATE public.profiles
     SET referral_reward_months   = COALESCE(referral_reward_months, 0) + 1,
         referral_reward_given_at = now()
   WHERE id = v_caller;

  -- Credit the referrer — one Elite month + bump their referral counter.
  UPDATE public.profiles
     SET referral_reward_months = COALESCE(referral_reward_months, 0) + 1,
         referral_count         = COALESCE(referral_count, 0) + 1
   WHERE id = v_referrer;

  RETURN jsonb_build_object(
    'ok', true,
    'credited_to_user',     v_caller,
    'credited_to_referrer', v_referrer
  );
END;
$$;

REVOKE ALL ON FUNCTION public.credit_referral_reward_if_eligible() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_referral_reward_if_eligible() TO authenticated;

COMMIT;
