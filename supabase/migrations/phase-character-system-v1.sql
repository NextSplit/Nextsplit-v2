-- phase-character-system-v1.sql
-- 2026-05-08 — Character system V1 — Phase 3+ Race tab foundation
--
-- Founder direction (this session):
--   · Two-layer class system: keep existing 7 RUNNER_CLASSES as auto-derived
--     archetypes (profiles.runner_class, already populated, descriptive flavour)
--     AND add 3 selectable build classes (track_star / trail_champion /
--     marathon_monster) on top as the active gameplay choice.
--   · Engagement-pro-rata XP rate ratios — modest 1.0× → 1.3× → 1.6× → 1.8×.
--     Stored as numeric on profiles so a future PR can A/B without migration.
--   · IRL training feeds character XP via new award_session_xp RPC, weighted
--     by (build_class × session_type). Session completion is the only true
--     progression lever (council-locked: no pay-to-win on outcomes).
--   · Race outcomes are completion-based, NOT VDOT-anchored. (Spec edit
--     PR #26 deleted rng_jitter; sim is fully deterministic.)
--
-- This migration ships the SCHEMA + 2 RPCs. PR1 wires award_session_xp into
-- /api/community/progress so logging a session feeds character stats today.
-- Race tables / simulate_race RPC / boost inventory all land in subsequent
-- PRs per docs/forge/character-gamification-v2-proposal.md.
--
-- All RPCs follow the F2.4 hardening pattern (PR #19): SECURITY DEFINER +
-- explicit auth.uid() body check + SET search_path = public, pg_temp.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION,
-- DROP POLICY IF EXISTS + CREATE POLICY for RLS.

BEGIN;

-- ============================================================
-- 1. characters table — 1:1 with profiles, optional (user must
--    "create" a character via the build-class picker step).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.characters (
  user_id          uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  build_class      text NOT NULL CHECK (build_class IN ('track_star','trail_champion','marathon_monster')),
  level            int NOT NULL DEFAULT 1,
  xp               bigint NOT NULL DEFAULT 0,
  speed_stat       int NOT NULL DEFAULT 0,
  endurance_stat   int NOT NULL DEFAULT 0,
  resilience_stat  int NOT NULL DEFAULT 0,
  active_cosmetics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- RLS: own row read/write; squad members can see each others' characters
-- (matches the existing squad-feed read pattern). No anon access.
DROP POLICY IF EXISTS "Own character read" ON public.characters;
CREATE POLICY "Own character read"
  ON public.characters
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Squad members read characters" ON public.characters;
CREATE POLICY "Squad members read characters"
  ON public.characters
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.squad_members sm1
    JOIN public.squad_members sm2 ON sm1.squad_id = sm2.squad_id
    WHERE sm1.user_id = auth.uid() AND sm2.user_id = characters.user_id
  ));

DROP POLICY IF EXISTS "Own character upsert" ON public.characters;
CREATE POLICY "Own character upsert"
  ON public.characters
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own character update build" ON public.characters;
CREATE POLICY "Own character update build"
  ON public.characters
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS characters_build_class_idx ON public.characters (build_class);
CREATE INDEX IF NOT EXISTS characters_xp_desc_idx ON public.characters (xp DESC);

-- updated_at trigger so any UPDATE refreshes the timestamp.
CREATE OR REPLACE FUNCTION public.characters_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $func$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS characters_updated_at ON public.characters;
CREATE TRIGGER characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.characters_set_updated_at();

-- ============================================================
-- 2. profiles.xp_rate_multiplier — engagement-pro-rata XP rate.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_rate_multiplier numeric NOT NULL DEFAULT 1.0;

-- ============================================================
-- 3. RPC: recompute_xp_rate_multiplier
--    Reads is_pro / has-active-coach / has-marketplace-plan and writes
--    profiles.xp_rate_multiplier accordingly.
--    Service-role only — called from subscription state webhooks +
--    coach-relationship change actions. Authenticated callers should
--    NOT be able to set their own multiplier.
-- ============================================================

CREATE OR REPLACE FUNCTION public.recompute_xp_rate_multiplier(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_is_pro             boolean;
  v_has_active_coach   boolean;
  v_has_marketplace    boolean;
  v_multiplier         numeric;
BEGIN
  -- Tier base
  SELECT COALESCE(p.is_pro, false)
    INTO v_is_pro
    FROM public.profiles p
   WHERE p.id = p_user_id;

  -- Active coach relationship? (coach_athletes has status = 'active')
  v_has_active_coach := EXISTS (
    SELECT 1 FROM public.coach_athletes ca
     WHERE ca.athlete_id = p_user_id
       AND ca.status = 'active'
  );

  -- Marketplace plan in use? (user has activated a plan with template_id
  -- and there's a coaching_subscription on that template's coach OR a
  -- purchase via coach_referrals)
  v_has_marketplace := EXISTS (
    SELECT 1 FROM public.user_plans up
     WHERE up.user_id = p_user_id
       AND up.status = 'active'
       AND up.template_id IS NOT NULL
       AND up.plan_type IN ('predetermined', 'coach_assigned')
  );

  -- Modest ratios (council /council R2 finance lens):
  --   Free                          → 1.0
  --   Elite                         → 1.3
  --   Elite + active coach          → 1.6
  --   Elite + active coach + plan   → 1.8
  IF NOT v_is_pro THEN
    v_multiplier := 1.0;
  ELSIF NOT v_has_active_coach THEN
    v_multiplier := 1.3;
  ELSIF NOT v_has_marketplace THEN
    v_multiplier := 1.6;
  ELSE
    v_multiplier := 1.8;
  END IF;

  UPDATE public.profiles
     SET xp_rate_multiplier = v_multiplier
   WHERE id = p_user_id;

  RETURN v_multiplier;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.recompute_xp_rate_multiplier(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_xp_rate_multiplier(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_xp_rate_multiplier(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.recompute_xp_rate_multiplier(uuid) TO service_role;

-- ============================================================
-- 4. RPC: award_session_xp
--    Awards class-weighted XP + per-stat increments based on
--    (build_class × session_type), multiplied by xp_rate_multiplier.
--    Caller-owns: auth.uid() must equal p_user_id.
-- ============================================================

CREATE OR REPLACE FUNCTION public.award_session_xp(
  p_user_id      uuid,
  p_session_type text,
  p_base_xp      integer DEFAULT 50
)
RETURNS TABLE(
  xp_awarded         integer,
  speed_delta        integer,
  endurance_delta    integer,
  resilience_delta   integer,
  build_class        text,
  multiplier_applied numeric,
  new_level          int,
  new_xp             bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_build_class text;
  v_multiplier  numeric;
  v_speed       int := 0;
  v_endurance   int := 0;
  v_resilience  int := 0;
  v_xp_awarded  int;
  v_new_xp      bigint;
  v_new_level   int;
  v_lc_session  text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501',
            HINT    = 'award_session_xp can only be called for your own user_id';
  END IF;

  -- Read build_class + multiplier. If user has no character yet, no-op
  -- and return zero deltas — the loop is silent until they pick a build.
  SELECT c.build_class, COALESCE(p.xp_rate_multiplier, 1.0)
    INTO v_build_class, v_multiplier
    FROM public.profiles p
    LEFT JOIN public.characters c ON c.user_id = p.id
   WHERE p.id = p_user_id;

  IF v_build_class IS NULL THEN
    RETURN QUERY SELECT
      0::int, 0::int, 0::int, 0::int,
      NULL::text, COALESCE(v_multiplier, 1.0)::numeric,
      1::int, 0::bigint;
    RETURN;
  END IF;

  v_lc_session := lower(COALESCE(p_session_type, 'easy'));

  -- Per-class × per-session-type stat awards. Mirrors
  -- src/lib/character.ts CLASS_XP_WEIGHTS — keep both in sync.
  IF v_build_class = 'track_star' THEN
    CASE v_lc_session
      WHEN 'interval'  THEN v_speed := 4;
      WHEN 'speed'     THEN v_speed := 4;
      WHEN 'threshold' THEN v_speed := 3;
      WHEN 'tempo'     THEN v_speed := 3;
      WHEN 'hill'      THEN v_speed := 2; v_resilience := 1;
      WHEN 'race'      THEN v_speed := 4; v_endurance := 1;
      WHEN 'long'      THEN v_endurance := 1;
      WHEN 'easy'      THEN v_speed := 1; v_endurance := 1;
      WHEN 'gym'       THEN v_speed := 1;
      WHEN 'recovery'  THEN v_resilience := 1;
      WHEN 'rest'      THEN NULL;
      ELSE v_endurance := 1; -- unknown session_type → soft fallback
    END CASE;
  ELSIF v_build_class = 'trail_champion' THEN
    CASE v_lc_session
      WHEN 'hill'      THEN v_resilience := 4;
      WHEN 'long'      THEN v_endurance := 3; v_resilience := 1;
      WHEN 'race'      THEN v_endurance := 2; v_resilience := 2;
      WHEN 'threshold' THEN v_endurance := 2;
      WHEN 'tempo'     THEN v_endurance := 2;
      WHEN 'gym'       THEN v_resilience := 2;
      WHEN 'recovery'  THEN v_resilience := 2;
      WHEN 'easy'      THEN v_endurance := 1;
      WHEN 'interval'  THEN v_speed := 1;
      WHEN 'speed'     THEN v_speed := 1;
      WHEN 'rest'      THEN NULL;
      ELSE v_endurance := 1;
    END CASE;
  ELSIF v_build_class = 'marathon_monster' THEN
    CASE v_lc_session
      WHEN 'long'      THEN v_endurance := 4;
      WHEN 'threshold' THEN v_endurance := 3;
      WHEN 'tempo'     THEN v_endurance := 3;
      WHEN 'race'      THEN v_endurance := 3; v_resilience := 1;
      WHEN 'easy'      THEN v_endurance := 2;
      WHEN 'hill'      THEN v_endurance := 2; v_resilience := 1;
      WHEN 'gym'       THEN v_resilience := 1;
      WHEN 'recovery'  THEN v_resilience := 1;
      WHEN 'interval'  THEN v_speed := 1;
      WHEN 'speed'     THEN v_speed := 1;
      WHEN 'rest'      THEN NULL;
      ELSE v_endurance := 1;
    END CASE;
  END IF;

  -- Apply multiplier. Round half-up to nearest int so partial XP doesn't
  -- silently truncate. Multiplier applies uniformly to all 4 amounts.
  v_speed       := round(v_speed       * v_multiplier);
  v_endurance   := round(v_endurance   * v_multiplier);
  v_resilience  := round(v_resilience  * v_multiplier);
  v_xp_awarded  := round(p_base_xp     * v_multiplier);

  -- Update character row + return new totals.
  UPDATE public.characters
     SET xp              = xp + v_xp_awarded,
         speed_stat      = speed_stat      + v_speed,
         endurance_stat  = endurance_stat  + v_endurance,
         resilience_stat = resilience_stat + v_resilience
   WHERE user_id = p_user_id
   RETURNING xp INTO v_new_xp;

  -- Derive level from RPG_LEVELS thresholds. Mirrors src/lib/rpg.ts
  -- getLevelForXP. Update characters.level only if it changed.
  -- (Lookup uses the existing thresholds: 0/150/350/650/1050/1550/2150/2850/3700/4700/...)
  v_new_level := CASE
    WHEN v_new_xp >= 4700 THEN 10
    WHEN v_new_xp >= 3700 THEN 9
    WHEN v_new_xp >= 2850 THEN 8
    WHEN v_new_xp >= 2150 THEN 7
    WHEN v_new_xp >= 1550 THEN 6
    WHEN v_new_xp >= 1050 THEN 5
    WHEN v_new_xp >=  650 THEN 4
    WHEN v_new_xp >=  350 THEN 3
    WHEN v_new_xp >=  150 THEN 2
    ELSE 1
  END;

  UPDATE public.characters
     SET level = v_new_level
   WHERE user_id = p_user_id AND level <> v_new_level;

  RETURN QUERY SELECT
    v_xp_awarded, v_speed, v_endurance, v_resilience,
    v_build_class, v_multiplier, v_new_level, v_new_xp;
END;
$func$;

-- award_session_xp is caller-owns (auth.uid() = p_user_id) — keep grant
-- to authenticated for normal API-route invocation through user-scoped
-- Supabase client. Body check enforces ownership.
GRANT EXECUTE ON FUNCTION public.award_session_xp(uuid, text, integer) TO authenticated;

COMMIT;

-- ============================================================
-- Verification (run after apply via Supabase MCP)
-- ============================================================
-- 1. characters table exists + RLS enabled:
--    SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'characters';
-- 2. xp_rate_multiplier column on profiles:
--    SELECT column_name FROM information_schema.columns
--      WHERE table_name = 'profiles' AND column_name = 'xp_rate_multiplier';
-- 3. RPC permissions:
--    SELECT has_function_privilege('authenticated','recompute_xp_rate_multiplier(uuid)','execute');
--    -- expect false
--    SELECT has_function_privilege('service_role','recompute_xp_rate_multiplier(uuid)','execute');
--    -- expect true
--    SELECT has_function_privilege('authenticated','award_session_xp(uuid, text, integer)','execute');
--    -- expect true
-- 4. Smoke test award_session_xp by inserting a character row + calling RPC:
--    INSERT INTO public.characters (user_id, build_class) VALUES ('<your-uuid>', 'track_star');
--    SELECT * FROM public.award_session_xp('<your-uuid>', 'interval', 50);
--    -- expect speed_delta = 4 × 1.0 = 4, xp_awarded = 50.
