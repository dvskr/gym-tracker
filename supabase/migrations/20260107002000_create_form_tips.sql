-- Create form_tips table
-- Stores expert form tips, cues, and safety information for exercises

CREATE TABLE IF NOT EXISTS form_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to exercise (uses UUID from exercises table)
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  
  -- Form guidance content
  key_cues TEXT[] DEFAULT '{}',           -- Array of key form cues
  common_mistakes TEXT[] DEFAULT '{}',    -- Array of common mistakes to avoid
  breathing TEXT,                         -- Breathing pattern description
  safety_tips TEXT[] DEFAULT '{}',        -- Array of safety tips
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One set of tips per exercise
  CONSTRAINT form_tips_exercise_unique UNIQUE(exercise_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_form_tips_exercise_id ON form_tips(exercise_id);

-- Enable RLS (form tips are public/read-only for all users)
ALTER TABLE form_tips ENABLE ROW LEVEL SECURITY;

-- Anyone can view form tips
CREATE POLICY "Anyone can view form tips"
  ON form_tips
  FOR SELECT
  USING (true);

-- Only authenticated users can insert (for admin/seeding purposes)
CREATE POLICY "Authenticated users can insert form tips"
  ON form_tips
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only authenticated users can update form tips
CREATE POLICY "Authenticated users can update form tips"
  ON form_tips
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_form_tips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER form_tips_updated_at
  BEFORE UPDATE ON form_tips
  FOR EACH ROW
  EXECUTE FUNCTION update_form_tips_updated_at();

-- Comments
COMMENT ON TABLE form_tips IS 'Expert form tips, cues, and safety information for exercises';
COMMENT ON COLUMN form_tips.key_cues IS 'Array of key form cues for proper technique';
COMMENT ON COLUMN form_tips.common_mistakes IS 'Array of common mistakes to avoid';
COMMENT ON COLUMN form_tips.breathing IS 'Description of proper breathing pattern';
COMMENT ON COLUMN form_tips.safety_tips IS 'Array of safety tips and warnings';

