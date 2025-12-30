-- Enhanced custom exercises review system

-- Add usage tracking table
CREATE TABLE IF NOT EXISTS custom_exercise_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  custom_exercise_id UUID NOT NULL REFERENCES custom_exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_in_workout_id UUID, -- Optional: link to specific workout
  used_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT custom_exercise_usage_unique UNIQUE(custom_exercise_id, used_in_workout_id, user_id)
);

-- Add indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_custom_exercises_pending_review 
  ON custom_exercises(is_pending_review, created_at DESC) 
  WHERE is_pending_review = true;

CREATE INDEX IF NOT EXISTS idx_custom_exercises_popular 
  ON custom_exercises(times_used DESC) 
  WHERE is_approved = false AND times_used > 0;

CREATE INDEX IF NOT EXISTS idx_custom_exercises_approved 
  ON custom_exercises(is_approved, approval_date DESC) 
  WHERE is_approved = true;

CREATE INDEX IF NOT EXISTS idx_custom_exercise_usage_exercise 
  ON custom_exercise_usage(custom_exercise_id, used_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_exercise_usage_user 
  ON custom_exercise_usage(user_id, used_at DESC);

-- Add reviewer tracking columns to custom_exercises
ALTER TABLE custom_exercises
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS unique_users_count INTEGER DEFAULT 0;

-- Function to update times_used counter
CREATE OR REPLACE FUNCTION increment_custom_exercise_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE custom_exercises 
  SET times_used = times_used + 1,
      last_used_at = NEW.used_at
  WHERE id = NEW.custom_exercise_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment usage count
DROP TRIGGER IF EXISTS custom_exercise_usage_counter ON custom_exercise_usage;
CREATE TRIGGER custom_exercise_usage_counter
  AFTER INSERT ON custom_exercise_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_custom_exercise_usage();

-- Function to update unique users count
CREATE OR REPLACE FUNCTION update_unique_users_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE custom_exercises 
  SET unique_users_count = (
    SELECT COUNT(DISTINCT user_id)
    FROM custom_exercise_usage
    WHERE custom_exercise_id = NEW.custom_exercise_id
  )
  WHERE id = NEW.custom_exercise_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update unique users count
DROP TRIGGER IF EXISTS custom_exercise_unique_users ON custom_exercise_usage;
CREATE TRIGGER custom_exercise_unique_users
  AFTER INSERT ON custom_exercise_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_unique_users_count();

-- RLS policies for custom_exercise_usage
ALTER TABLE custom_exercise_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON custom_exercise_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert own usage"
  ON custom_exercise_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add admin role check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies for custom_exercises (can view all pending)
CREATE POLICY "Admins can view all custom exercises"
  ON custom_exercises
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update custom exercises"
  ON custom_exercises
  FOR UPDATE
  USING (is_admin());

-- Comments
COMMENT ON TABLE custom_exercise_usage IS 'Track usage of custom exercises across users for popularity metrics';
COMMENT ON COLUMN custom_exercises.unique_users_count IS 'Number of unique users who have used this custom exercise';
COMMENT ON COLUMN custom_exercises.review_notes IS 'Admin notes about the review decision';
COMMENT ON COLUMN custom_exercises.reviewed_by IS 'Admin user who reviewed this submission';
COMMENT ON COLUMN custom_exercises.rejection_reason IS 'Reason provided if exercise was rejected';

