-- ─── PHASE: Track 1 audit hotfix — v1 ────────────────────────────────────────
-- Author: Claude (audit + council synthesis 2026-05-08)
-- Source: docs/audit/audit-report-v1.md + docs/audit/roadmap-integration-v1.md
--
-- This migration consolidates the SQL portion of the Track 1 hotfix.
-- Block B (can_nudge SECURITY DEFINER guard) was applied live earlier this
-- session and is therefore NOT repeated here.
--
-- BEFORE APPLYING: next-session Claude MUST first verify schema state via
-- the Supabase MCP server (mcp__supabase__list_tables, list_extensions,
-- pg_policies dump). The previous attempt at the plan_templates RLS patch
-- failed with 42703 because an assumed column name (coach_id) didn't exist;
-- the actual column is author_id. Verify column names exist before running.
--
-- Pre-flight result captured this session:
--   pg_class scan returned every public table with rls_enabled = true
--   EXCEPT plan_templates which returned false. That single table is the
--   F2.1 escalation; everything else is RLS-enabled. (Re-run the audit
--   query first thing in the next session — this state is from 2026-05-08
--   evening UK time and may have drifted if anything was applied since.)
--
-- This migration covers:
--   F2.1 (plan_templates RLS — author-owned management + permissive
--        counter-bump policy until Track 2 SECURITY DEFINER RPCs land)
--   F2.2 (nps_responses cross-user SELECT leak)
--
-- It does NOT cover:
--   F0.1 (delete deploy.yml — done in this session)
--   F0.3 (admin email gate — done in this session, src/app/admin/retention/page.tsx)
--   S12  (manifest.json background_color — done in this session)
--   S3   (can_nudge guard — applied live before this file was written)
--
-- Rollback: each block is wrapped to be re-runnable. The DROP POLICY IF
-- EXISTS / CREATE POLICY pattern is idempotent. The ALTER TABLE ENABLE RLS
-- is idempotent (Postgres no-op if already enabled).
-- ──────────────────────────────────────────────────────────────────────────────


-- ─── F2.1 · plan_templates RLS escalation ─────────────────────────────────────
-- Status before: rls_enabled = false. Existing dormant policy
-- "Authenticated users can read plan templates" did nothing because RLS
-- was off. Anyone authenticated could SELECT/INSERT/UPDATE/DELETE
-- arbitrary rows in the predetermined-plan catalogue.
--
-- Status after: RLS on; the existing read policy fires; coaches manage
-- their own plans (author_id = auth.uid()); non-owners can still bump
-- counters (intentionally permissive UPDATE, see Track 2 follow-up).
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;

-- Authors manage their own plan_templates rows (covers
-- /api/coach/save-plan INSERT/UPDATE and /api/coach/plans/assign
-- author-side reads).
DROP POLICY IF EXISTS "Authors manage own plan templates" ON plan_templates;
CREATE POLICY "Authors manage own plan templates" ON plan_templates
  FOR ALL
  TO authenticated
  USING      (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Counter-bump UPDATEs from non-owners (review.avg_rating, review_count;
-- purchase.total_starts; assign.total_starts increment). Permissive
-- WITH CHECK (true) until Track 2 wraps these in SECURITY DEFINER RPCs
-- and re-tightens this policy to author-only.
DROP POLICY IF EXISTS "Authenticated bump counters" ON plan_templates;
CREATE POLICY "Authenticated bump counters" ON plan_templates
  FOR UPDATE
  TO authenticated
  USING      (true)
  WITH CHECK (true);


-- ─── F2.2 · nps_responses cross-user SELECT leak ──────────────────────────────
-- Status before: policy "Service role reads all NPS" had FOR SELECT
-- USING (true) with no role qualifier — therefore granting every
-- authenticated user SELECT access to every other user's free-text NPS
-- comment. Plausibly Art 33 reportable if a complaint reaches ICO.
--
-- Status after: same intent ("the dashboard sees everything") but
-- scoped TO service_role. Authenticated users keep their own row
-- access via the existing "Users manage own NPS responses" policy.
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Service role reads all NPS" ON nps_responses;
CREATE POLICY "Service role reads all NPS" ON nps_responses
  FOR SELECT
  TO service_role
  USING (true);


-- ─── Verification ─────────────────────────────────────────────────────────────
-- Run these after the migration. Each comment is the expected result.

-- 1) plan_templates RLS on:
--    expect: relrowsecurity = t
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'plan_templates';

-- 2) plan_templates has 3 policies:
--    expect rows: "Authenticated bump counters" (UPDATE),
--                 "Authenticated users can read plan templates" (SELECT),
--                 "Authors manage own plan templates" (ALL)
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'plan_templates';

-- 3) nps_responses leak closed (run as a NON-admin authenticated session
--    via Supabase JS client — not as service_role from SQL Editor):
--    expect: only your own row(s) returned
-- SELECT id, user_id, score, trigger FROM nps_responses;

-- 4) Cross-account smoke:
--    Founder hits /admin/retention → loads. Non-admin email → 307 to /today.
--    (F0.3 admin gate is a code change, not SQL.)
