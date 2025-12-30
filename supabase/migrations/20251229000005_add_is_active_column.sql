-- Add is_active column to exercises table
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_exercises_active 
ON exercises(is_active) WHERE is_active = true;

