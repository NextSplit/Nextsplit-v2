-- ============================================================
-- Phase 3: Reviews + Featured Plans
-- Run in Supabase SQL Editor
-- ============================================================

-- Coach reviews
CREATE TABLE IF NOT EXISTS coach_reviews (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id     uuid REFERENCES coach_profiles(user_id) ON DELETE CASCADE NOT NULL,
  athlete_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id      text,
  rating       integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text  text,
  coach_reply  text,
  is_visible   boolean DEFAULT false,
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE(coach_id, athlete_id)
);
ALTER TABLE coach_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes manage own reviews" ON coach_reviews FOR ALL USING (auth.uid() = athlete_id);
CREATE POLICY "Public reads visible reviews" ON coach_reviews FOR SELECT USING (is_visible = true);
CREATE POLICY "Coach reads own reviews"      ON coach_reviews FOR SELECT USING (auth.uid() = coach_id);
CREATE POLICY "Coach replies to reviews"     ON coach_reviews FOR UPDATE USING (auth.uid() = coach_id);

-- Featured plans
CREATE TABLE IF NOT EXISTS featured_plans (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id  uuid REFERENCES plan_templates(id) ON DELETE CASCADE NOT NULL,
  week_start   date NOT NULL,
  feature_type text CHECK (feature_type IN ('algorithmic','editorial','debut')) DEFAULT 'editorial',
  position     integer DEFAULT 1,
  impressions  integer DEFAULT 0,
  clicks       integer DEFAULT 0,
  conversions  integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE featured_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads featured plans" ON featured_plans FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS featured_plans_week ON featured_plans(week_start);

-- Add missing columns to plan_templates
ALTER TABLE plan_templates
  ADD COLUMN IF NOT EXISTS author_type      text DEFAULT 'nextsplit' CHECK (author_type IN ('nextsplit','coach')),
  ADD COLUMN IF NOT EXISTS author_id        uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS price_gbp        numeric(8,2),
  ADD COLUMN IF NOT EXISTS is_public        boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS avg_completion_rate numeric(4,2),
  ADD COLUMN IF NOT EXISTS total_starts     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_completions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating       numeric(3,2),
  ADD COLUMN IF NOT EXISTS review_count     integer DEFAULT 0;
