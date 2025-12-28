-- Comprehensive health sync columns migration
-- This ensures all health-related columns exist across workouts and body_weight_log tables

-- ============================================
-- WORKOUTS TABLE - Health Sync Columns
-- ============================================

-- Basic health sync tracking
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS health_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS health_synced_at TIMESTAMPTZ;

-- Workout metrics
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS calories_burned INTEGER;

-- Heart rate metrics
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS avg_heart_rate INTEGER;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS max_heart_rate INTEGER;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS min_heart_rate INTEGER;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS resting_heart_rate INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workouts_health_synced 
ON workouts (health_synced);

CREATE INDEX IF NOT EXISTS idx_workouts_health_synced_unsynced
ON workouts (user_id, health_synced) 
WHERE health_synced = FALSE AND ended_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workouts_avg_heart_rate 
ON workouts (avg_heart_rate) 
WHERE avg_heart_rate IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workouts_max_heart_rate 
ON workouts (max_heart_rate) 
WHERE max_heart_rate IS NOT NULL;

-- ============================================
-- BODY_WEIGHT_LOG TABLE - Health Sync Columns
-- ============================================

-- Basic health sync tracking
ALTER TABLE body_weight_log ADD COLUMN IF NOT EXISTS health_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE body_weight_log ADD COLUMN IF NOT EXISTS health_synced_at TIMESTAMPTZ;

-- Data source tracking
ALTER TABLE body_weight_log ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
-- Possible values: 'manual', 'health_import', 'api'

-- Body composition (for sync with health platforms)
ALTER TABLE body_weight_log ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL(5, 2);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_body_weight_log_health_synced 
ON body_weight_log (health_synced);

CREATE INDEX IF NOT EXISTS idx_body_weight_log_health_synced_unsynced
ON body_weight_log (user_id, health_synced) 
WHERE health_synced = FALSE;

CREATE INDEX IF NOT EXISTS idx_body_weight_log_source 
ON body_weight_log (user_id, source);

-- ============================================
-- BODY_MEASUREMENTS TABLE - Health Sync Columns
-- ============================================

ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS health_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS health_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_body_measurements_health_synced 
ON body_measurements (health_synced);

CREATE INDEX IF NOT EXISTS idx_body_measurements_health_synced_unsynced
ON body_measurements (user_id, health_synced) 
WHERE health_synced = FALSE;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN workouts.health_synced IS 'Whether this workout has been synced to Apple Health/Health Connect';
COMMENT ON COLUMN workouts.health_synced_at IS 'Timestamp when workout was synced to health platform';
COMMENT ON COLUMN workouts.calories_burned IS 'Estimated or measured calories burned during workout';
COMMENT ON COLUMN workouts.avg_heart_rate IS 'Average heart rate (BPM) during workout';
COMMENT ON COLUMN workouts.max_heart_rate IS 'Maximum heart rate (BPM) during workout';
COMMENT ON COLUMN workouts.min_heart_rate IS 'Minimum heart rate (BPM) during workout';
COMMENT ON COLUMN workouts.resting_heart_rate IS 'Resting heart rate (BPM) before workout';

COMMENT ON COLUMN body_weight_log.health_synced IS 'Whether this weight entry has been synced to health platform';
COMMENT ON COLUMN body_weight_log.health_synced_at IS 'Timestamp when weight was synced to health platform';
COMMENT ON COLUMN body_weight_log.source IS 'Source of weight data: manual (user entered), health_import (from health platform), api (external)';
COMMENT ON COLUMN body_weight_log.body_fat_percentage IS 'Body fat percentage (0-100)';

COMMENT ON COLUMN body_measurements.health_synced IS 'Whether these measurements have been synced to health platform';
COMMENT ON COLUMN body_measurements.health_synced_at IS 'Timestamp when measurements were synced to health platform';

