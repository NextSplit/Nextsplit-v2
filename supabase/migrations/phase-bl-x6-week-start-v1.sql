-- phase-bl-x6-week-start-v1.sql
-- 2026-05-10 — BL-X6 close-out — profiles.week_start preference column.
--
-- HANDOFF v0.4 cross-cutting backlog noted that BL-X6 wanted three columns:
-- timezone (shipped P2.7), unit_preference (already shipped as `units` in
-- the live schema — naming drift), and week_start. This migration closes
-- the last of the three.
--
-- Default 'monday' matches the existing implicit week-boundary in
-- src/app/home/HomeClient.tsx getWeeklyKm() and per-week aggregations
-- across Train + Squad. UK-default convention. Users in regions with
-- Sunday-start weeks (US conventional, parts of Asia) can flip via
-- /settings.
--
-- CHECK constraint matches the only two boundary conventions running
-- apps support; further options (Saturday, etc.) can be added later
-- without an incompatible migration.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS week_start text NOT NULL DEFAULT 'monday'
  CHECK (week_start IN ('monday', 'sunday'));

COMMIT;
