-- ─── Cross-cutting backlog: query indexes ─────────────────────────────────
-- Council backlog BL-X4 + BL-X5. Two indexes that pay off as the user base
-- grows past F1 size:
--
-- BL-X4 — squad_nudges(to_user, sent_at DESC)
--   Powers "who has nudged me lately" queries (athlete inbox view, future
--   nudge-feed rendering). The existing index is on (from_user, to_user,
--   sent_at) which is keyed for the can_nudge rate-limit RPC; a separate
--   index keyed on to_user is needed for the recipient-side scan.
--
-- BL-X5 — training_logs(user_id, logged_at)
--   Powers retention-dashboard cohort queries (see /admin/retention) and
--   the squad-feed RPC's user-period scans. Without this index, every
--   ".eq('user_id', ?).gte('logged_at', ?)" query does a full-table scan
--   that grows linearly with total log volume.
--
-- Both use IF NOT EXISTS — safe to re-run.

BEGIN;

CREATE INDEX IF NOT EXISTS squad_nudges_recipient_recent
  ON public.squad_nudges (to_user, sent_at DESC);

CREATE INDEX IF NOT EXISTS training_logs_user_logged_at
  ON public.training_logs (user_id, logged_at DESC);

COMMIT;

-- Verification:
--   SELECT indexname FROM pg_indexes
--    WHERE tablename IN ('squad_nudges','training_logs')
--      AND indexname IN ('squad_nudges_recipient_recent','training_logs_user_logged_at');
-- Expected: both rows returned.
