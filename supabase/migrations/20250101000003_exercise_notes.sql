-- Exercise personal notes table
-- Allows users to add their own notes, form cues, and tips for exercises

CREATE TABLE IF NOT EXISTS exercise_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  
  -- Note content
  notes TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One note per user per exercise
  CONSTRAINT exercise_notes_user_exercise_unique UNIQUE(user_id, exercise_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exercise_notes_user 
  ON exercise_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_exercise_notes_exercise 
  ON exercise_notes(exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_notes_user_exercise 
  ON exercise_notes(user_id, exercise_id);

-- Enable RLS
ALTER TABLE exercise_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notes"
  ON exercise_notes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON exercise_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON exercise_notes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON exercise_notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_exercise_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exercise_notes_updated_at
  BEFORE UPDATE ON exercise_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_exercise_notes_updated_at();

-- Comments
COMMENT ON TABLE exercise_notes IS 'User-specific notes for exercises (form cues, setup tips, personal reminders)';
COMMENT ON COLUMN exercise_notes.notes IS 'User''s personal notes, form cues, setup instructions, etc.';

