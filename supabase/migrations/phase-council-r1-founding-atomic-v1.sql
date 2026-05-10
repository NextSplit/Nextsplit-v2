-- Council R1 (BACKEND/QA-RISK) — Atomic founding-count claim.
--
-- The Node-side incrementFoundingCount in lib/stripe.ts:47-60 is read-then-
-- write: SELECT current value → UPDATE current+1. Two concurrent Stripe
-- webhook fires (e.g. checkout.session.completed for two simultaneous new
-- subscriptions) both read 499, both write 500. Result: 502 founding spots
-- sold against a 500-spot promise. The "price never rises" copy on the
-- UpgradeModal is then unenforceable for spots 501-502.
--
-- Fix: SECURITY DEFINER RPC that does FOR UPDATE → read → check limit →
-- conditional increment in a single transaction. The lock serialises
-- concurrent webhook calls on the row.
--
-- Returns:
--   · The NEW count (1..FOUNDING_LIMIT) on successful claim
--   · -1 when the founding tier is full (caller falls back to standard price)
--   · 0 reserved (we never return 0 since first claim returns 1)
--
-- Service-role-only — invoked from the Stripe webhook context after a
-- subscription becomes 'active'. Authenticated users can't call it
-- directly (REVOKE EXECUTE FROM authenticated).

CREATE OR REPLACE FUNCTION public.claim_founding_spot()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
  v_limit integer := 500;
BEGIN
  -- FOR UPDATE locks the row for the duration of this transaction.
  -- Concurrent calls block here until the first commits.
  SELECT COALESCE(value::integer, 0)
    INTO v_count
    FROM public.app_config
   WHERE key = 'founding_member_count'
   FOR UPDATE;

  -- Bootstrap: if the row doesn't exist yet, treat count as 0.
  IF v_count IS NULL THEN
    INSERT INTO public.app_config (key, value, updated_at)
    VALUES ('founding_member_count', '1', now())
    ON CONFLICT (key) DO NOTHING;
    RETURN 1;
  END IF;

  -- Tier full — caller falls back to standard pricing.
  IF v_count >= v_limit THEN
    RETURN -1;
  END IF;

  UPDATE public.app_config
     SET value      = (v_count + 1)::text,
         updated_at = now()
   WHERE key = 'founding_member_count';

  RETURN v_count + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_founding_spot() FROM public, anon, authenticated;
