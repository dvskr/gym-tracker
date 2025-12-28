-- Add updated_at columns to tables that need them for sync

-- Add updated_at to workouts table
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at to workout_templates table (if not exists)
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to auto-update updated_at on workouts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
DROP TRIGGER IF EXISTS update_workout_templates_updated_at ON workout_templates;

-- Create triggers
CREATE TRIGGER update_workouts_updated_at
    BEFORE UPDATE ON workouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_templates_updated_at
    BEFORE UPDATE ON workout_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workouts_updated_at ON workouts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_templates_updated_at ON workout_templates(updated_at DESC);

