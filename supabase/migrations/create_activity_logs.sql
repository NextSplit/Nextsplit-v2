-- Activity logs for non-running sports (swimming, cycling, walking, hiking)
CREATE TABLE IF NOT EXISTS activity_logs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type   text NOT NULL CHECK (activity_type IN ('swim', 'cycle', 'walk', 'hike', 'yoga', 'other')),
  logged_at       date NOT NULL DEFAULT CURRENT_DATE,
  duration_secs   integer,
  distance_km     numeric(6,2),
  calories        integer,
  effort          integer CHECK (effort BETWEEN 1 AND 10),
  notes           text,
  strava_id       bigint,
  created_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own activity logs"
  ON activity_logs FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS activity_logs_user_date 
  ON activity_logs(user_id, logged_at DESC);
