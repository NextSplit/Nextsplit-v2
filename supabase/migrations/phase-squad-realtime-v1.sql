-- phase-squad-realtime-v1.sql
-- 2026-05-13 — PR J16: enable Supabase Realtime for squad chat surfaces.
--
-- Background: the `supabase_realtime` publication was empty, so the
-- SquadFeed.tsx realtime listener (PR P1.1, May 2026) never received
-- INSERT events. Squad cards only appeared after a manual page reload.
--
-- Fix: add 3 tables to the publication. RLS still gates row delivery,
-- so non-squad-members do NOT receive rows from another squad's feed.
--   · squad_feed                — new milestone cards (already in
--                                 SquadFeed.tsx INSERT listener)
--   · squad_feed_reactions      — reactions added/removed by other
--                                 squad-mates (new in J16)
--   · notifications             — user's own notification toasts
--                                 (new in J16, future-use)
--
-- REPLICA IDENTITY FULL on `squad_feed_reactions` ensures DELETE events
-- carry the full pre-delete row data (so the client can resolve which
-- feed_item_id the deletion belongs to — default replica identity only
-- broadcasts the primary-key column, which is just `id`).

BEGIN;

ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_feed_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

ALTER TABLE public.squad_feed_reactions REPLICA IDENTITY FULL;

COMMIT;

-- Verification (run after apply):
--   SELECT tablename FROM pg_publication_tables
--    WHERE pubname = 'supabase_realtime'
--      AND schemaname = 'public'
--    ORDER BY tablename;
--   Expect: notifications, squad_feed, squad_feed_reactions
--
--   SELECT c.relname,
--          CASE c.relreplident WHEN 'd' THEN 'default'
--                              WHEN 'f' THEN 'full' END AS replica
--     FROM pg_class c
--    WHERE c.relname = 'squad_feed_reactions';
--   Expect: replica = 'full'
