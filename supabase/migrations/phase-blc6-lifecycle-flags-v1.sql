-- BL-C6 (lifecycle) — Trial-warning + expiry idempotency flags.
--
-- Builds on phase-blc6-trial-unlock-v1.sql. Adds two more timestamps so
-- the smart-notify cron can dispatch one-shot warning + expiry pushes
-- without duplicating across daily fires:
--
--   · trial_warned_at  — set when day-13 "1 day left" push fires
--   · trial_ended_at   — already added in v1; used to gate the expiry push
--
-- expire_overdue_trials() RPC: service-role-only sweep that flips
-- trial_ended_at = now() for any row past 14 days. Returns the affected
-- user_ids so the caller can fire the "trial ended" push exactly once
-- per user. Idempotent via the `trial_ended_at IS NULL` guard in the
-- WHERE clause.
--
-- warn_overdue_trials() RPC: parallel sweep for the 13-day warning
-- (1 day left). Returns user_ids that just received the warning flag.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_warned_at timestamptz;

CREATE OR REPLACE FUNCTION public.expire_overdue_trials()
RETURNS TABLE (user_id uuid, trial_source text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.profiles p
     SET trial_ended_at      = now(),
         subscription_status = CASE
                                 WHEN COALESCE(p.is_pro, false) THEN p.subscription_status
                                 ELSE 'expired'
                               END
   WHERE p.trial_started_at IS NOT NULL
     AND p.trial_ended_at   IS NULL
     AND p.trial_started_at + interval '14 days' < now()
   RETURNING p.id AS user_id, p.trial_source;
$$;

REVOKE ALL ON FUNCTION public.expire_overdue_trials() FROM public, anon, authenticated;
-- Service role only — invoked from the smart-notify cron via admin client.

CREATE OR REPLACE FUNCTION public.warn_overdue_trials()
RETURNS TABLE (user_id uuid, trial_source text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.profiles p
     SET trial_warned_at = now()
   WHERE p.trial_started_at IS NOT NULL
     AND p.trial_ended_at   IS NULL
     AND p.trial_warned_at  IS NULL
     AND p.trial_started_at + interval '13 days' < now()
     AND p.trial_started_at + interval '14 days' >= now()
   RETURNING p.id AS user_id, p.trial_source;
$$;

REVOKE ALL ON FUNCTION public.warn_overdue_trials() FROM public, anon, authenticated;
