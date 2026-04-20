-- ============================================================
-- Feedback table + GDPR data export function
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug','feature','general')),
  message       text NOT NULL,
  rating        integer CHECK (rating BETWEEN 1 AND 5),
  page          text,
  user_agent    text,
  status        text DEFAULT 'new' CHECK (status IN ('new','reviewed','actioned','dismissed')),
  admin_notes   text,
  created_at    timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users submit own feedback" ON feedback FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users read own feedback"   ON feedback FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX feedback_status ON feedback(status, created_at DESC);
CREATE INDEX feedback_user   ON feedback(user_id, created_at DESC);

-- 2. ai_usage feature column (for per-feature tracking)
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS feature text DEFAULT 'daily_coach';

-- 3. GDPR: data export function
-- Returns all user data as JSON for right-to-portability requests
CREATE OR REPLACE FUNCTION export_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow users to export their own data
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorised';
  END IF;

  RETURN jsonb_build_object(
    'exported_at',    now(),
    'profile',        (SELECT row_to_json(p) FROM profiles p WHERE id = p_user_id),
    'goals',          (SELECT jsonb_agg(row_to_json(g)) FROM user_goals g WHERE user_id = p_user_id),
    'plans',          (SELECT jsonb_agg(row_to_json(up)) FROM user_plans up WHERE user_id = p_user_id),
    'training_logs',  (SELECT jsonb_agg(row_to_json(tl)) FROM training_logs tl WHERE user_id = p_user_id),
    'gym_logs',       (SELECT jsonb_agg(row_to_json(gl)) FROM gym_logs gl WHERE user_id = p_user_id),
    'wellness_logs',  (SELECT jsonb_agg(row_to_json(wl)) FROM wellness_logs wl WHERE user_id = p_user_id),
    'races',          (SELECT jsonb_agg(row_to_json(r)) FROM races r WHERE user_id = p_user_id),
    'activity_logs',  (SELECT jsonb_agg(row_to_json(al)) FROM activity_logs al WHERE user_id = p_user_id),
    'feedback',       (SELECT jsonb_agg(row_to_json(f)) FROM feedback f WHERE user_id = p_user_id)
  );
END;
$$;

-- 4. GDPR: account deletion — cascades via FK ON DELETE CASCADE on all tables
-- This is already handled by auth.users cascade, but add explicit function for audit trail
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorised';
  END IF;
  -- Cascade deletes all user data via FK constraints
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
