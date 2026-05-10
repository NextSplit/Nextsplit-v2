-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  COMBINED PENDING MIGRATIONS — paste once into Supabase SQL editor       ║
-- ║                                                                          ║
-- ║  Generated 2026-05-10 — bundles five outstanding migrations from PRs    ║
-- ║  #53 / #54 / #55 / #57 / #60. Every statement uses IF NOT EXISTS /       ║
-- ║  OR REPLACE / DROP IF EXISTS guards, so re-running this whole file       ║
-- ║  on a partially-applied DB is safe — already-applied statements no-op.  ║
-- ║                                                                          ║
-- ║  Apply order (dependency-safe; the only hard dep is #5 needing #4's     ║
-- ║  trial_started_at column):                                               ║
-- ║                                                                          ║
-- ║    1. P3.9 nudge A/B effectiveness                                       ║
-- ║    2. BL-C2 reaction-only annotations                                    ║
-- ║    3. BL-C4 coach digest runs                                            ║
-- ║    4. BL-C6 trial unlock (RPCs + columns)                                ║
-- ║    5. BL-C6 lifecycle (warning + expiry sweeps)                          ║
-- ║                                                                          ║
-- ║  Wrapped in a single transaction so a mid-file failure rolls back        ║
-- ║  cleanly. Run-time on an empty DB ≈ < 1s.                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1 / 5 — phase-p3-9-nudge-ab-v1.sql           (PR #53 — squad nudges)   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- P3.9 — Squad nudge A/B effectiveness framework.
--
-- Roadmap: "template tagging + drop-dead detection". Closes the F1-gated
-- effectiveness measurement gap by capturing the full lifecycle of a nudge
-- (sent → opened → dismissed) plus an A/B copy variant tag so we can compare
-- two copy banks once usage accumulates.
--
-- "Drop-dead" = sent then dismissed without ever opening. The signal we
-- actually care about: which copy lines get ignored.

ALTER TABLE public.squad_nudges
  ADD COLUMN IF NOT EXISTS template_variant text NOT NULL DEFAULT 'a'
    CHECK (template_variant IN ('a', 'b')),
  ADD COLUMN IF NOT EXISTS opened_at    timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

CREATE INDEX IF NOT EXISTS squad_nudges_summary
  ON public.squad_nudges (message_key, template_variant);

DROP POLICY IF EXISTS "Recipients update tracking" ON public.squad_nudges;
CREATE POLICY "Recipients update tracking" ON public.squad_nudges
  FOR UPDATE
  USING (auth.uid() = to_user)
  WITH CHECK (auth.uid() = to_user);

CREATE OR REPLACE FUNCTION public.nudge_effectiveness_summary()
RETURNS TABLE (
  message_key       text,
  template_variant  text,
  sent_count        bigint,
  opened_count      bigint,
  dismissed_count   bigint,
  drop_dead_count   bigint,
  open_rate         numeric,
  drop_dead_rate    numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    n.message_key,
    n.template_variant,
    COUNT(*)                                              AS sent_count,
    COUNT(*) FILTER (WHERE n.opened_at IS NOT NULL)       AS opened_count,
    COUNT(*) FILTER (WHERE n.dismissed_at IS NOT NULL)    AS dismissed_count,
    COUNT(*) FILTER (
      WHERE n.dismissed_at IS NOT NULL AND n.opened_at IS NULL
    )                                                      AS drop_dead_count,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE n.opened_at IS NOT NULL)
            / NULLIF(COUNT(*), 0),
      2
    )                                                      AS open_rate,
    ROUND(
      100.0 * COUNT(*) FILTER (
        WHERE n.dismissed_at IS NOT NULL AND n.opened_at IS NULL
      ) / NULLIF(COUNT(*), 0),
      2
    )                                                      AS drop_dead_rate
  FROM public.squad_nudges n
  GROUP BY n.message_key, n.template_variant
  ORDER BY n.message_key, n.template_variant;
$$;

REVOKE ALL ON FUNCTION public.nudge_effectiveness_summary() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.nudge_effectiveness_summary() TO authenticated;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2 / 5 — phase-blc2-annotation-reaction-only-v1.sql  (PR #54)            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- BL-C2 — Allow reaction-only coach annotations.
--
-- The original session_annotations schema declared `note text NOT NULL`,
-- which blocked the 2-tap reaction surface (1 tap to open athlete, 1 tap
-- to send 🔥/💙/🧊/📞 with no typed note). Drop NOT NULL and add a CHECK
-- that requires either `note` OR `reaction` so the row still carries a
-- coach signal. Existing rows already have `note` populated so backfill
-- is a no-op.

ALTER TABLE public.session_annotations
  ALTER COLUMN note DROP NOT NULL;

ALTER TABLE public.session_annotations
  DROP CONSTRAINT IF EXISTS session_annotations_signal_present;

ALTER TABLE public.session_annotations
  ADD CONSTRAINT session_annotations_signal_present
  CHECK (note IS NOT NULL OR reaction IS NOT NULL);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3 / 5 — phase-blc4-coach-digest-runs-v1.sql   (PR #55 — Monday digest) ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- BL-C4 — Coach-Pro Monday digest idempotency table.
--
-- One row per (coach_id, ISO-week period). Acts as the idempotency lock
-- for the smart-notify Monday fan-out: if a row exists for (coach_id,
-- 'YYYY-Www'), the digest already ran this week and we skip. The cached
-- payload survives so a coach can review what was sent without
-- regenerating.

CREATE TABLE IF NOT EXISTS public.coach_digest_runs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period          text NOT NULL,                -- ISO week, e.g. '2026-W19'
  athlete_count   integer NOT NULL DEFAULT 0,
  digest_payload  jsonb,                        -- snapshot of per-athlete summary lines
  delivered_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE (coach_id, period)
);

CREATE INDEX IF NOT EXISTS coach_digest_runs_coach
  ON public.coach_digest_runs (coach_id, period DESC);

ALTER TABLE public.coach_digest_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach reads own digest runs" ON public.coach_digest_runs;
CREATE POLICY "Coach reads own digest runs" ON public.coach_digest_runs
  FOR SELECT
  USING (auth.uid() = coach_id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4 / 5 — phase-blc6-trial-unlock-v1.sql        (PR #57 — trial unlock)  ║
-- ║          ← MUST run before lifecycle (5/5)                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- BL-C6 — Delayed-start trial unlock without hard Stripe dependency.
--
-- 14-day Pro trial granted automatically by either of two engagement
-- events: squad-join, or first inbound coach message. Trial is one-shot
-- per user — once granted, the second trigger is a no-op.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_source     text
    CHECK (trial_source IN ('squad_join', 'first_coach_message')),
  ADD COLUMN IF NOT EXISTS trial_ended_at   timestamptz;

CREATE INDEX IF NOT EXISTS profiles_trial_active
  ON public.profiles (trial_started_at)
  WHERE trial_ended_at IS NULL AND trial_started_at IS NOT NULL;

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
     AND trial_started_at IS NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_trial_if_eligible(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.grant_trial_if_eligible(text) TO authenticated;

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


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5 / 5 — phase-blc6-lifecycle-flags-v1.sql     (PR #60 — cron sweeps)   ║
-- ║          ← Depends on 4/5 (trial_started_at column must exist)          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- BL-C6 (lifecycle) — Trial-warning + expiry idempotency flags + sweep
-- RPCs. Service-role-only; invoked from smart-notify cron.

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


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Done. COMMIT below makes everything live.                               ║
-- ║  Verify with:                                                            ║
-- ║    SELECT column_name FROM information_schema.columns                    ║
-- ║     WHERE table_name='profiles' AND column_name LIKE 'trial%';           ║
-- ║    SELECT * FROM public.nudge_effectiveness_summary();                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

COMMIT;
