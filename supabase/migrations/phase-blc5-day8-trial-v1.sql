-- BL-C5 — Delayed-start auto-trial (day 8 of signup).
--
-- Sibling to BL-C6 (squad-join + first-coach-msg triggers). Covers solo
-- runners who never join a squad or get a coach message — without this,
-- those users only ever see the paywall, never the unlocked Pro
-- experience that BL-C6 grants.
--
-- Trigger: 8 days after signup (created_at < now() - 7 days), grant the
-- 14-day trial automatically. Source tagged 'day8_auto' so the funnel
-- admin can see how it performs vs the engagement-based onramps.
--
-- Idempotent via the same `trial_started_at IS NULL AND is_pro = false`
-- guard as BL-C6 — users who already got a trial via squad-join or
-- coach-msg never get a second one.
--
-- Bounded backfill: users created more than 30 days ago are skipped so
-- the first cron fire after deploy doesn't grant trials retroactively
-- to a year of dormant accounts. Founder can adjust the window if a
-- broader sweep is wanted.

-- ── Extend the trial_source CHECK constraint ────────────────────────────────
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_trial_source_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_trial_source_check
  CHECK (trial_source IN ('squad_join', 'first_coach_message', 'day8_auto'));

-- ── grant_day8_auto_trials() RPC ────────────────────────────────────────────
-- Service-role-only — invoked from smart-notify cron via admin client.
-- Returns the affected user_ids so the caller can fire a welcome push
-- exactly once per grant.

CREATE OR REPLACE FUNCTION public.grant_day8_auto_trials()
RETURNS TABLE (user_id uuid, trial_source text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp, auth
AS $$
  UPDATE public.profiles p
     SET trial_started_at  = now(),
         trial_source      = 'day8_auto',
         subscription_status = 'trialing'
    FROM auth.users u
   WHERE p.id = u.id
     AND p.trial_started_at IS NULL
     AND COALESCE(p.is_pro, false) = false
     AND u.created_at < now() - interval '7 days'
     AND u.created_at > now() - interval '30 days'
   RETURNING p.id AS user_id, p.trial_source;
$$;

REVOKE ALL ON FUNCTION public.grant_day8_auto_trials() FROM public, anon, authenticated;
