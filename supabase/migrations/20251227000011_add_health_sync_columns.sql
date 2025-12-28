-- Add health sync columns to body_weight_log table
ALTER TABLE body_weight_log ADD COLUMN IF NOT EXISTS health_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE body_weight_log ADD COLUMN IF NOT EXISTS health_synced_at TIMESTAMPTZ;

-- Add source column to track where the data came from
ALTER TABLE body_weight_log ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
-- source can be: 'manual', 'health_import', 'api'

-- Create index for faster querying of unsynced entries
CREATE INDEX IF NOT EXISTS idx_body_weight_log_health_synced 
ON body_weight_log (user_id, health_synced) 
WHERE health_synced = FALSE;

-- Add health_synced_at column to workouts (health_synced already exists from previous migration)
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS health_synced_at TIMESTAMPTZ;

-- Create index for faster querying of unsynced workouts
CREATE INDEX IF NOT EXISTS idx_workouts_health_synced_unsynced
ON workouts (user_id, health_synced) 
WHERE health_synced = FALSE AND ended_at IS NOT NULL;

