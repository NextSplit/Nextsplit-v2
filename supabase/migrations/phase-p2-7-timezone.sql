-- ─── Phase P2.7: User timezone column ─────────────────────────────────────
-- Council /council 2026-05-07, P2.7 followup.
--
-- Adds profiles.timezone (IANA identifier) so the smart-notify cron can
-- gate per-user delivery to a sensible local-time window (default 09:00-
-- 21:00). Without this, the cron's single 14:00 UTC fire pings APAC
-- runners around midnight local — they unsubscribe.
--
-- Captured client-side via Intl.DateTimeFormat().resolvedOptions().timeZone
-- on profile load. Idempotent, safe to re-run.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text;

COMMIT;

-- Verification:
--   SELECT count(*) FROM profiles WHERE timezone IS NULL;
-- Expected: total user count immediately after apply (capture happens on
-- next visit per user). Should drop toward zero over the next ~7 days.
