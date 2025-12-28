-- Personal Records table for tracking user PRs per exercise
CREATE TABLE personal_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  record_type TEXT NOT NULL, -- 'max_weight', 'max_reps', 'max_volume'
  value DECIMAL(10,2) NOT NULL,
  weight DECIMAL(7,2), -- The weight for this PR (for context)
  reps INTEGER, -- The reps for this PR (for context)
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per user/exercise/type
  UNIQUE(user_id, exercise_id, record_type)
);

-- Indexes for faster queries
CREATE INDEX idx_personal_records_user_id ON personal_records(user_id);
CREATE INDEX idx_personal_records_exercise_id ON personal_records(exercise_id);
CREATE INDEX idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);

-- Row Level Security
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own records
CREATE POLICY "Users own personal records" ON personal_records 
  FOR ALL USING (auth.uid() = user_id);

-- Add is_pr column to workout_sets to mark sets that were PRs
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS is_pr BOOLEAN DEFAULT false;
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS pr_type TEXT; -- 'max_weight', 'max_reps', 'max_volume'

COMMENT ON TABLE personal_records IS 'Stores personal records for each exercise per user';
COMMENT ON COLUMN personal_records.record_type IS 'Type of PR: max_weight (highest weight lifted), max_reps (most reps at any weight), max_volume (single set weight × reps)';

