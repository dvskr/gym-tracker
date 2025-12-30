-- Create custom_exercises table for user-created exercises

CREATE TABLE IF NOT EXISTS custom_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Exercise details
  name TEXT NOT NULL,
  equipment TEXT NOT NULL,
  category TEXT NOT NULL,
  primary_muscles TEXT[] DEFAULT '{}',
  secondary_muscles TEXT[] DEFAULT '{}',
  instructions TEXT[] DEFAULT '{}',
  notes TEXT,
  
  -- Measurement configuration
  measurement_type TEXT DEFAULT 'reps_weight',
  
  -- Media (optional)
  custom_gif_url TEXT,
  
  -- Review system (for community feedback)
  is_pending_review BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT FALSE,
  approval_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  CONSTRAINT custom_exercises_name_user_unique UNIQUE(user_id, name)
);

-- Create index for faster queries
CREATE INDEX idx_custom_exercises_user_id ON custom_exercises(user_id);
CREATE INDEX idx_custom_exercises_category ON custom_exercises(category);
CREATE INDEX idx_custom_exercises_pending ON custom_exercises(is_pending_review) WHERE is_pending_review = true;
CREATE INDEX idx_custom_exercises_approved ON custom_exercises(is_approved) WHERE is_approved = true;

-- Add RLS policies
ALTER TABLE custom_exercises ENABLE ROW LEVEL SECURITY;

-- Users can read their own custom exercises
CREATE POLICY "Users can view own custom exercises"
  ON custom_exercises
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own custom exercises
CREATE POLICY "Users can insert own custom exercises"
  ON custom_exercises
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom exercises
CREATE POLICY "Users can update own custom exercises"
  ON custom_exercises
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own custom exercises
CREATE POLICY "Users can delete own custom exercises"
  ON custom_exercises
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_exercises_updated_at
  BEFORE UPDATE ON custom_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_exercises_updated_at();

-- Add comments
COMMENT ON TABLE custom_exercises IS 'User-created custom exercises for personalized workout tracking';
COMMENT ON COLUMN custom_exercises.is_pending_review IS 'Flag for exercises awaiting admin review for public library addition';
COMMENT ON COLUMN custom_exercises.is_approved IS 'Admin-approved custom exercises that could be added to main library';
COMMENT ON COLUMN custom_exercises.times_used IS 'Track how often the exercise is used in workouts';

