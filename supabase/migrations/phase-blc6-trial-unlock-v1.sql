-- BL-C6 — Delayed-start trial unlock without hard Stripe dependency.
--
-- Roadmap: "Trial unlock on squad-join OR first coach msg (avoids hard
-- Stripe dependency)". Two trigger events grant a 14-day Pro trial:
--   1. User joins a squad — squad-as-onramp
--   2. User receives their first coach→athlete message — coach-as-onramp
--
-- Both paths qualify the user as "engaged enough to be worth the unlock".
-- Trial is one-shot per user — once granted, regardless of source, the
-- second trigger is a no-op.
--
-- Schema:
--   profiles + trial_started_at — when the trial began (NULL = never had one)
--   profiles + trial_source     — 'squad_join' | 'first_coach_message'
--   profiles + trial_ended_at   — set when the 14-day window closes (lazy
--                                 expiry: client polls + cron sweeps).
--
-- RPC `grant_trial_if_eligible(p_source)`:
--   · SECDEF + locked search_path (F2.4 hardening pattern)
--   · Idempotent — only writes if trial_started_at IS NULL AND is_pro = false
--   · Returns boolean: true if granted on this call, false if no-op
--
-- RPC `expire_trial_if_due()`:
--   · Lazy-expiry helper called by useSubscription on mount + by smart-notify
--     cron. Sets trial_ended_at = now() if trial_started_at + 14d < now()
--     AND trial_ended_at IS NULL.
--   · Returns boolean: true if expired on this call.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_source     text
    CHECK (trial_source IN ('squad_join', 'first_coach_message')),
  ADD COLUMN IF NOT EXISTS trial_ended_at   timestamptz;

CREATE INDEX IF NOT EXISTS profiles_trial_active
  ON public.profiles (trial_started_at)
  WHERE trial_ended_at IS NULL AND trial_started_at IS NOT NULL;

-- ── grant_trial_if_eligible ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.grant_trial_if_eligible(p_source text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_eligible  boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_source NOT IN ('squad_join', 'first_coach_message') THEN
    RAISE EXCEPTION 'Invalid trial source: %', p_source;
  END IF;

  -- Eligibility: never had a trial AND not currently Pro.
  SELECT (trial_started_at IS NULL AND COALESCE(is_pro, false) = false)
    INTO v_eligible
    FROM public.profiles
   WHERE id = v_user_id;

  IF NOT COALESCE(v_eligible, false) THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
     SET trial_started_at  = now(),
         trial_source      = p_source,
         subscription_status = 'trialing'
   WHERE id = v_user_id
     AND trial_started_at IS NULL;  -- belt-and-braces against concurrent grants

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_trial_if_eligible(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.grant_trial_if_eligible(text) TO authenticated;

-- ── expire_trial_if_due ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_trial_if_due()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
     SET trial_ended_at      = now(),
         subscription_status = CASE
                                 WHEN COALESCE(is_pro, false) THEN subscription_status
                                 ELSE 'expired'
                               END
   WHERE id = v_user_id
     AND trial_started_at IS NOT NULL
     AND trial_ended_at   IS NULL
     AND trial_started_at + interval '14 days' < now();

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_trial_if_due() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.expire_trial_if_due() TO authenticated;
