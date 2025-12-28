-- Add health sync tracking columns to workouts table

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS health_synced BOOLEAN DEFAULT false;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS health_synced_at TIMESTAMPTZ;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS calories_burned INTEGER;

-- Create index for querying unsynced workouts
CREATE INDEX IF NOT EXISTS idx_workouts_health_synced ON workouts(health_synced) WHERE health_synced = false;

-- Add comment
COMMENT ON COLUMN workouts.health_synced IS 'Whether this workout has been synced to Apple Health or Health Connect';
COMMENT ON COLUMN workouts.health_synced_at IS 'Timestamp when workout was synced to health platform';
COMMENT ON COLUMN workouts.calories_burned IS 'Estimated or tracked calories burned during workout';

