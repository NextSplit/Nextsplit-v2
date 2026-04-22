-- ─── Phase CM1 — Coaching Marketplace ────────────────────────────────────────
-- Enhanced coach profiles, review system, featured coaches, verification tiers
-- Run after: phase-sl2-depth.sql

-- ── coach_profiles extensions ─────────────────────────────────────────────────
ALTER TABLE coach_profiles
  ADD COLUMN IF NOT EXISTS video_intro_url     text,
  ADD COLUMN IF NOT EXISTS video_intro_seconds integer,
  ADD COLUMN IF NOT EXISTS specialty_tags      text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS distance_tags       text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS athlete_type_tags   text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS language_tags       text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS timezone            text,
  ADD COLUMN IF NOT EXISTS coach_pbs           jsonb   DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS avg_rating          numeric(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count        integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_rate     numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_athletes      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until      timestamptz,
  ADD COLUMN IF NOT EXISTS verification_tier   text    DEFAULT 'listed'
    CHECK (verification_tier IN ('listed', 'credential_verified', 'elite')),
  ADD COLUMN IF NOT EXISTS credential_url      text,
  ADD COLUMN IF NOT EXISTS credential_status   text    DEFAULT 'pending'
    CHECK (credential_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS uka_number          text,
  ADD COLUMN IF NOT EXISTS group_coaching      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_max_size      integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS group_price_gbp     numeric(8,2);

-- ── Coach reviews table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_reviews (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  athlete_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coach_athlete_id  uuid REFERENCES coach_athletes(id) ON DELETE SET NULL,
  rating            integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text       text    CHECK (length(review_text) <= 1000),
  would_recommend   boolean DEFAULT true,
  is_anonymous      boolean DEFAULT true,
  is_flagged        boolean DEFAULT false,
  flag_reason       text,
  published_at      timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now(),
  UNIQUE (coach_id, athlete_id)
);

ALTER TABLE coach_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews readable by all" ON coach_reviews;
CREATE POLICY "reviews readable by all" ON coach_reviews
  FOR SELECT USING (NOT is_flagged);

DROP POLICY IF EXISTS "athlete writes own review" ON coach_reviews;
CREATE POLICY "athlete writes own review" ON coach_reviews
  FOR INSERT WITH CHECK (athlete_id = auth.uid());

DROP POLICY IF EXISTS "athlete updates own review" ON coach_reviews;
CREATE POLICY "athlete updates own review" ON coach_reviews
  FOR UPDATE USING (athlete_id = auth.uid());

-- ── RPC: refresh coach aggregate rating ───────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_coach_rating(p_coach_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE coach_profiles
  SET
    avg_rating    = (SELECT COALESCE(AVG(rating::numeric), 0) FROM coach_reviews WHERE coach_id = p_coach_id AND NOT is_flagged),
    review_count  = (SELECT COUNT(*) FROM coach_reviews WHERE coach_id = p_coach_id AND NOT is_flagged)
  WHERE user_id = p_coach_id;
END;
$$;

-- ── RPC: coaches for marketplace browse ───────────────────────────────────────
CREATE OR REPLACE FUNCTION marketplace_coaches(
  p_specialty    text    DEFAULT NULL,
  p_distance     text    DEFAULT NULL,
  p_max_price    numeric DEFAULT NULL,
  p_language     text    DEFAULT NULL,
  p_verified_only boolean DEFAULT false,
  p_limit        integer DEFAULT 20,
  p_offset       integer DEFAULT 0
)
RETURNS TABLE (
  user_id           uuid,
  display_name      text,
  slug              text,
  bio               text,
  photo_url         text,
  location          text,
  specialty_tags    text[],
  distance_tags     text[],
  athlete_type_tags text[],
  rate_monthly_gbp  numeric,
  rate_plan_gbp     numeric,
  avg_rating        numeric,
  review_count      integer,
  total_athletes    integer,
  completion_rate   numeric,
  verified          boolean,
  verification_tier text,
  is_featured       boolean,
  accepting_athletes boolean,
  group_coaching    boolean,
  group_price_gbp   numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    cp.user_id, cp.display_name, cp.slug, cp.bio, cp.photo_url,
    cp.location, cp.specialty_tags, cp.distance_tags, cp.athlete_type_tags,
    cp.rate_monthly_gbp, cp.rate_plan_gbp,
    cp.avg_rating, cp.review_count, cp.total_athletes, cp.completion_rate,
    cp.verified, cp.verification_tier, cp.is_featured, cp.accepting_athletes,
    cp.group_coaching, cp.group_price_gbp
  FROM coach_profiles cp
  WHERE cp.accepting_athletes = true
    AND (p_specialty    IS NULL OR p_specialty    = ANY(cp.specialty_tags))
    AND (p_distance     IS NULL OR p_distance     = ANY(cp.distance_tags))
    AND (p_max_price    IS NULL OR cp.rate_monthly_gbp <= p_max_price OR cp.rate_monthly_gbp IS NULL)
    AND (p_language     IS NULL OR p_language     = ANY(cp.language_tags))
    AND (NOT p_verified_only  OR cp.verified = true)
  ORDER BY
    cp.is_featured DESC,
    cp.avg_rating  DESC,
    cp.review_count DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;
