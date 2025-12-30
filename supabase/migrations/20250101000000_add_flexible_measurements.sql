-- Add measurement system support to exercises and exercise_sets tables

-- Add measurement_type to exercises table
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS measurement_type TEXT DEFAULT 'reps_weight';

-- Add comment for measurement_type options
COMMENT ON COLUMN exercises.measurement_type IS 'Options: reps_weight, time, distance, reps_only, time_weight, assisted, amrap';

-- Add additional measurement fields to exercise_sets table
ALTER TABLE exercise_sets
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS distance_meters DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS assistance_weight DECIMAL(10,2);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exercises_measurement_type ON exercises(measurement_type);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_duration ON exercise_sets(duration_seconds) WHERE duration_seconds IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercise_sets_distance ON exercise_sets(distance_meters) WHERE distance_meters IS NOT NULL;

-- Add comments to new columns
COMMENT ON COLUMN exercise_sets.duration_seconds IS 'Duration in seconds for time-based exercises (plank, cardio, etc.)';
COMMENT ON COLUMN exercise_sets.distance_meters IS 'Distance in meters for cardio exercises (running, cycling, rowing)';
COMMENT ON COLUMN exercise_sets.assistance_weight IS 'Assistance weight in kg for assisted exercises (negative weight means assistance)';

