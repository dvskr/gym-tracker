-- Add heart rate tracking columns to workouts table

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS avg_heart_rate INTEGER;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS max_heart_rate INTEGER;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS min_heart_rate INTEGER;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS resting_heart_rate INTEGER;

-- Add index for heart rate queries
CREATE INDEX IF NOT EXISTS idx_workouts_avg_heart_rate ON workouts(avg_heart_rate) WHERE avg_heart_rate IS NOT NULL;

-- Add comments
COMMENT ON COLUMN workouts.avg_heart_rate IS 'Average heart rate during workout (bpm)';
COMMENT ON COLUMN workouts.max_heart_rate IS 'Maximum heart rate during workout (bpm)';
COMMENT ON COLUMN workouts.min_heart_rate IS 'Minimum heart rate during workout (bpm)';
COMMENT ON COLUMN workouts.resting_heart_rate IS 'Resting heart rate at time of workout (bpm)';

