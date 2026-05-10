-- BL-C4 — Coach-Pro Monday digest idempotency table.
--
-- One row per (coach_id, ISO-week period). Acts as the idempotency lock for
-- the smart-notify Monday fan-out: if a row exists for (coach_id,
-- 'YYYY-Www'), the digest already ran this week and we skip. The cached
-- payload survives so a coach can review what was sent without
-- regenerating.
--
-- Why piggy-back on smart-notify rather than a third cron: Vercel Hobby
-- caps daily crons at 2 (smart-notify 14:00 UTC + race-tick 22:05 UTC).
-- Founder decision 2026-05-07 / roadmap §9 v0.3.

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

-- Coach can read their own digest history. Inserts/updates happen only via
-- service-role from the cron context (no INSERT policy = blocked by default
-- for non-service-role callers, which is what we want).
DROP POLICY IF EXISTS "Coach reads own digest runs" ON public.coach_digest_runs;
CREATE POLICY "Coach reads own digest runs" ON public.coach_digest_runs
  FOR SELECT
  USING (auth.uid() = coach_id);
