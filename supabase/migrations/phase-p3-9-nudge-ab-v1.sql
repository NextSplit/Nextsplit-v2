-- P3.9 — Squad nudge A/B effectiveness framework.
--
-- Roadmap: "template tagging + drop-dead detection". Closes the F1-gated
-- effectiveness measurement gap by capturing the full lifecycle of a nudge
-- (sent → opened → dismissed) plus an A/B copy variant tag so we can compare
-- two copy banks once usage accumulates.
--
-- What this migration does:
--   1. Add tracking columns to squad_nudges:
--        · template_variant ('a' | 'b') — which copy bank fired
--        · opened_at  — first time recipient interacted (tap-through to /squad)
--        · dismissed_at — recipient swiped/× the in-app notification
--   2. Allow recipients to UPDATE their own nudge rows (only the two
--      tracking timestamps; the existing INSERT policy is unchanged).
--   3. Expose `nudge_effectiveness_summary()` — SECURITY DEFINER aggregate
--      callable by any authenticated user, returns per-(message_key, variant)
--      counts with open_rate and drop_dead_rate computed.
--
-- "Drop-dead" = sent then dismissed without ever opening. The signal we
-- actually care about: which copy lines get ignored.

ALTER TABLE public.squad_nudges
  ADD COLUMN IF NOT EXISTS template_variant text NOT NULL DEFAULT 'a'
    CHECK (template_variant IN ('a', 'b')),
  ADD COLUMN IF NOT EXISTS opened_at    timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

CREATE INDEX IF NOT EXISTS squad_nudges_summary
  ON public.squad_nudges (message_key, template_variant);

-- Recipient can flip their own opened_at / dismissed_at. RLS prevents
-- cross-row writes; the API additionally bounds the column set so callers
-- can't tamper with sent_at, message_key, etc.
DROP POLICY IF EXISTS "Recipients update tracking" ON public.squad_nudges;
CREATE POLICY "Recipients update tracking" ON public.squad_nudges
  FOR UPDATE
  USING (auth.uid() = to_user)
  WITH CHECK (auth.uid() = to_user);

-- Effectiveness summary. F2.4 hardening pattern: SECURITY DEFINER + locked
-- search_path + REVOKE ALL then GRANT EXECUTE to authenticated. Returns
-- one row per (message_key, template_variant) pair across all-time.
CREATE OR REPLACE FUNCTION public.nudge_effectiveness_summary()
RETURNS TABLE (
  message_key       text,
  template_variant  text,
  sent_count        bigint,
  opened_count      bigint,
  dismissed_count   bigint,
  drop_dead_count   bigint,
  open_rate         numeric,
  drop_dead_rate    numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    n.message_key,
    n.template_variant,
    COUNT(*)                                              AS sent_count,
    COUNT(*) FILTER (WHERE n.opened_at IS NOT NULL)       AS opened_count,
    COUNT(*) FILTER (WHERE n.dismissed_at IS NOT NULL)    AS dismissed_count,
    COUNT(*) FILTER (
      WHERE n.dismissed_at IS NOT NULL AND n.opened_at IS NULL
    )                                                      AS drop_dead_count,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE n.opened_at IS NOT NULL)
            / NULLIF(COUNT(*), 0),
      2
    )                                                      AS open_rate,
    ROUND(
      100.0 * COUNT(*) FILTER (
        WHERE n.dismissed_at IS NOT NULL AND n.opened_at IS NULL
      ) / NULLIF(COUNT(*), 0),
      2
    )                                                      AS drop_dead_rate
  FROM public.squad_nudges n
  GROUP BY n.message_key, n.template_variant
  ORDER BY n.message_key, n.template_variant;
$$;

REVOKE ALL ON FUNCTION public.nudge_effectiveness_summary() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.nudge_effectiveness_summary() TO authenticated;
