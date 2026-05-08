-- phase-future-date-guard-v1.sql
-- 2026-05-08 — Belt-and-suspenders guard against future-dated training_logs
--
-- Audit + QA-risk + character-gamification /forge all flagged the same hole:
-- nothing prevents a malicious client (or a buggy code path) from writing a
-- training_log with logged_at set arbitrarily far in the future, which would
-- pre-fill character XP / streaks / consistency stats before the session
-- has actually happened. Daily-progression-cap honesty depends on the hard
-- rule "only past/today sessions can log".
--
-- The training-log write path is client → Supabase via useTrainingLog hook
-- (RLS-gated user client; no API route in between). So the only reliable
-- defence against a tampered client is at the DB layer.
--
-- Tolerance: now() + interval '18 hours'.
-- Rationale: max IANA timezone offset is UTC+14 (Kiribati / Line Islands
-- DST). A user in UTC+14 logging at 23:59 local time submits a timestamp
-- that the UTC server sees ~14 hours into the future. 18 hours adds a
-- 4-hour cushion for clock-skew + slow uploads + DST shifts. QA-risk in
-- /forge specifically asked for ±18h.
--
-- Idempotent: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT.
--
-- Pre-flight verified (via Supabase MCP execute_sql 2026-05-08): zero
-- existing rows violate the proposed constraint, so adding it is non-
-- destructive.

BEGIN;

ALTER TABLE public.training_logs
  DROP CONSTRAINT IF EXISTS training_logs_logged_at_not_future;

ALTER TABLE public.training_logs
  ADD CONSTRAINT training_logs_logged_at_not_future
  CHECK (logged_at <= (now() + interval '18 hours'));

COMMIT;

-- Verification (run after apply):
-- 1. Constraint exists:
--    SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--     WHERE conrelid = 'public.training_logs'::regclass
--       AND conname = 'training_logs_logged_at_not_future';
--    Expect: CHECK (logged_at <= (now() + '18:00:00'::interval))
-- 2. Insertion of a 7-day-future timestamp is rejected:
--    INSERT INTO public.training_logs (user_id, plan_id, week_n, day_i, session_i, done, logged_at)
--      VALUES ('<your-uuid>', '<plan-uuid>', 1, 0, 0, true, now() + interval '7 days');
--    Expect: ERROR: new row for relation "training_logs" violates check constraint
-- 3. A normal "log a session today" insert continues to work.
