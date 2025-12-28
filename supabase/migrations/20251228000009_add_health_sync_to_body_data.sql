-- Add health sync tracking to body_weight_log table

ALTER TABLE body_weight_log ADD COLUMN IF NOT EXISTS health_synced BOOLEAN DEFAULT false;
ALTER TABLE body_weight_log ADD COLUMN IF NOT EXISTS health_synced_at TIMESTAMPTZ;
ALTER TABLE body_weight_log ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL(5,2);

-- Add health sync tracking to body_measurements table
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS health_synced BOOLEAN DEFAULT false;
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS health_synced_at TIMESTAMPTZ;

-- Create indexes for querying unsynced entries
CREATE INDEX IF NOT EXISTS idx_body_weight_log_health_synced 
  ON body_weight_log(health_synced) 
  WHERE health_synced = false;

CREATE INDEX IF NOT EXISTS idx_body_measurements_health_synced 
  ON body_measurements(health_synced) 
  WHERE health_synced = false;

-- Add comments
COMMENT ON COLUMN body_weight_log.health_synced IS 'Whether this weight entry has been synced to Apple Health or Health Connect';
COMMENT ON COLUMN body_weight_log.health_synced_at IS 'Timestamp when weight was synced to health platform';
COMMENT ON COLUMN body_weight_log.body_fat_percentage IS 'Body fat percentage (if measured)';

COMMENT ON COLUMN body_measurements.health_synced IS 'Whether these measurements have been synced to health platform';
COMMENT ON COLUMN body_measurements.health_synced_at IS 'Timestamp when measurements were synced to health platform';

