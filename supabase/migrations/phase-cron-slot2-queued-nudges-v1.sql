-- Smart-notify slot 2 — leader-queued squad nudges.
--
-- Closes the TODO in /api/cron/smart-notify/route.ts. Leaders previously
-- could only fire nudges immediately via /api/squad/nudge — no way to
-- queue one for a future date. This adds a `queued_for_date` column so
-- leaders can stage nudges to land on a specific morning (e.g. queue a
-- "long-run Sunday" reminder on Friday so it lands at 14:00 UTC Sunday
-- without the leader needing to open the app at exactly the right time).
--
-- Backwards compatible: queued_for_date NULL ⇒ immediate-fire (existing
-- behaviour). A row with queued_for_date set is dormant until the cron
-- picks it up on the matching date.
--
-- Idempotency: cron updates queued_for_date = NULL after firing so the
-- same row never fires twice. The (recipient, date) UNIQUE-ish guard
-- in the cron logic handles the case where multiple rows queue for the
-- same recipient on the same date — first one wins, others get cleared
-- and Sentry-logged.

ALTER TABLE public.squad_nudges
  ADD COLUMN IF NOT EXISTS queued_for_date date;

CREATE INDEX IF NOT EXISTS squad_nudges_queued_due
  ON public.squad_nudges (queued_for_date)
  WHERE queued_for_date IS NOT NULL;
