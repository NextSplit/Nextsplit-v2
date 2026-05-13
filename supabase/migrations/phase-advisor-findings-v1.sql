-- phase-advisor-findings-v1.sql
-- 2026-05-13 — PR J1: Supabase advisor sweep findings.
--
-- Closes 2 RLS-policy-always-true findings + tightens bug_reports SELECT
-- (worse than the advisor caught — SELECT was also unrestricted to public)
-- + adds explicit comment to cron_runs to silence the INFO advisor.
--
-- Founder-side action also required (documented in HANDOFF v9.20):
--   Enable "Leaked Password Protection" in Supabase Auth dashboard
--   (Project Settings → Auth → Password Security → toggle on).
--   Cannot be applied from SQL.

BEGIN;

-- ============================================================
-- bug_reports — close anon SELECT + scope INSERT
-- ============================================================
-- BEFORE:
--   SELECT policy "service role can view bug reports" was
--     TO public USING (true) — anyone could read every bug report
--     including URL + user-agent + message contents (PII risk).
--   INSERT policy "users can insert bug reports" was
--     TO public WITH CHECK (true) — anyone (incl. unauth) could
--     insert any row, including forging user_id of another user.
DROP POLICY IF EXISTS "service role can view bug reports" ON public.bug_reports;
DROP POLICY IF EXISTS "users can insert bug reports"      ON public.bug_reports;

-- service_role bypasses RLS, so no SELECT policy is needed for the
-- only legitimate reader. Leaving SELECT policy-less is intentional.

CREATE POLICY "authenticated can insert own bug reports"
  ON public.bug_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "anon can insert anonymous bug reports"
  ON public.bug_reports
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

COMMENT ON TABLE public.bug_reports IS
  'User-submitted bug reports. SELECT is service_role-only by RLS '
  '(no policy). INSERT is scoped: authenticated callers must own the '
  'user_id; anon callers must leave user_id NULL.';

-- ============================================================
-- plan_templates — drop wide-open UPDATE, route counters via RPC
-- ============================================================
-- BEFORE: "Authenticated bump counters" was
--   TO authenticated USING (true) WITH CHECK (true) — any authenticated
--   user could overwrite weeks_data / name / price_gbp of ANY plan
--   template. Counter bumps (total_starts, total_completions) belong
--   in a SECURITY DEFINER RPC so the data path doesn't need a broad
--   policy at all.
DROP POLICY IF EXISTS "Authenticated bump counters" ON public.plan_templates;

CREATE OR REPLACE FUNCTION public.bump_plan_template_starts(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '42501' USING MESSAGE = 'authentication required';
  END IF;
  UPDATE public.plan_templates
     SET total_starts = COALESCE(total_starts, 0) + 1
   WHERE id = p_template_id;
END;
$$;

REVOKE ALL    ON FUNCTION public.bump_plan_template_starts(uuid) FROM PUBLIC;
REVOKE ALL    ON FUNCTION public.bump_plan_template_starts(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.bump_plan_template_starts(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bump_plan_template_completions(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '42501' USING MESSAGE = 'authentication required';
  END IF;
  UPDATE public.plan_templates
     SET total_completions = COALESCE(total_completions, 0) + 1
   WHERE id = p_template_id;
END;
$$;

REVOKE ALL    ON FUNCTION public.bump_plan_template_completions(uuid) FROM PUBLIC;
REVOKE ALL    ON FUNCTION public.bump_plan_template_completions(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.bump_plan_template_completions(uuid) TO authenticated;

-- ============================================================
-- cron_runs — explicit intent for advisor INFO finding
-- ============================================================
-- BEFORE: RLS enabled but no policy = service_role-only by default.
-- Advisor flags as INFO because intent is ambiguous from schema alone.
-- Service_role bypasses RLS regardless, so this is documentation, not
-- enforcement.
COMMENT ON TABLE public.cron_runs IS
  'Cron execution telemetry. service_role-only by design — no policies '
  'for authenticated/anon. /admin/health reads via service_role.';

COMMIT;

-- Verification (run after apply):
--   SELECT polname, polcmd, polroles::regrole[], qual, with_check
--     FROM pg_policy
--    WHERE polrelid = 'public.bug_reports'::regclass
--    ORDER BY polname;
--   Expect:
--     "anon can insert anonymous bug reports"           INSERT {anon}           NULL  (user_id IS NULL)
--     "authenticated can insert own bug reports"        INSERT {authenticated}  NULL  (user_id = auth.uid())
--   No SELECT policy → service_role-only.
--
--   SELECT polname, polcmd FROM pg_policy
--    WHERE polrelid = 'public.plan_templates'::regclass
--    ORDER BY polname;
--   Expect: only "Authenticated users can read plan templates" SELECT,
--           "Authors manage own plan templates" ALL.
--           No "Authenticated bump counters".
