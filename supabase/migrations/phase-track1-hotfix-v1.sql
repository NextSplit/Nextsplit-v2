-- phase-track1-hotfix-v1.sql
-- Track 1 closeout (audit hotfix) — 2026-05-08
--
-- Scope:
--   Block A · F2.1 — plan_templates RLS canonical version-controlled record.
--               Live DB already has RLS=true with 3 policies (added via the
--               Supabase dashboard pre-migration system). This block writes
--               them into the migration record so future drift is detectable.
--               Idempotent: DROP POLICY IF EXISTS + CREATE POLICY.
--   Block B · F2.2 — nps_responses SELECT leak fix. The existing
--               "Service role reads all NPS" policy was created without a
--               TO clause, which means PostgreSQL applies it to ALL roles
--               (`polroles = {-}` in the live DB), letting any authenticated
--               user SELECT every NPS row. service_role bypasses RLS by
--               design, so the policy was never needed for admin reads.
--               Drop it and recreate scoped explicitly to service_role for
--               documentation clarity.
--
-- NOT included:
--   · S3 can_nudge auth.uid() guard — already live in production
--     (verified via pg_get_functiondef before this migration was authored).
--     Body contains: IF auth.uid() IS NULL OR auth.uid() <> p_from THEN
--       RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'.
--
-- Audit references: docs/audit/audit-report-v1.md §F2.1, §F2.2, §S3.
-- Council synthesis: docs/audit/audit-report-v1.md §Phase 8.

BEGIN;

-- =====================================================
-- Block A · F2.1 plan_templates RLS canonical record
-- =====================================================

ALTER TABLE public.plan_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read plan templates"
  ON public.plan_templates;
CREATE POLICY "Authenticated users can read plan templates"
  ON public.plan_templates
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authors manage own plan templates"
  ON public.plan_templates;
CREATE POLICY "Authors manage own plan templates"
  ON public.plan_templates
  FOR ALL
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated bump counters"
  ON public.plan_templates;
CREATE POLICY "Authenticated bump counters"
  ON public.plan_templates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Block C · F2.2 nps_responses SELECT leak fix
-- =====================================================
-- (Block B reserved for S3 can_nudge — already applied; intentionally absent.)

DROP POLICY IF EXISTS "Service role reads all NPS"
  ON public.nps_responses;

CREATE POLICY "Service role reads all NPS"
  ON public.nps_responses
  FOR SELECT
  TO service_role
  USING (true);

COMMIT;

-- =====================================================
-- Verification queries (run after apply)
-- =====================================================
-- 1. plan_templates RLS enabled + 3 policies:
--    SELECT relname, relrowsecurity FROM pg_class
--      WHERE relname = 'plan_templates' AND relnamespace = 'public'::regnamespace;
--    SELECT polname FROM pg_policy
--      WHERE polrelid = 'public.plan_templates'::regclass
--      ORDER BY polname;
-- 2. nps_responses SELECT scoped to service_role:
--    SELECT polname, polcmd, polroles::regrole[] FROM pg_policy
--      WHERE polrelid = 'public.nps_responses'::regclass
--      ORDER BY polname;
--    Expect: "Service role reads all NPS" → polroles = {service_role}.
-- 3. Cross-account smoke test:
--      SELECT count(*) FROM public.nps_responses;
--    As a non-admin authenticated user this must return only that user's
--    own rows (or 0). If a non-admin sees rows belonging to other users,
--    the migration did not apply correctly.
