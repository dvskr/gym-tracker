-- Optional Database Enhancements
-- These are NOT required but recommended for better performance and data validation

-- 1. Add index on progress_photos.photo_type for filtering by type
CREATE INDEX IF NOT EXISTS idx_photos_type ON progress_photos(photo_type);

-- 2. Add index on weight_goals for active goals
CREATE INDEX IF NOT EXISTS idx_weight_goals_active ON weight_goals(user_id, achieved_at) 
  WHERE achieved_at IS NULL;

-- 3. Add index on personal_records.achieved_at for recent PRs
CREATE INDEX IF NOT EXISTS idx_personal_records_achieved ON personal_records(achieved_at DESC);

-- 4. Add index on template_exercises for faster template loading
CREATE INDEX IF NOT EXISTS idx_template_exercises_template ON template_exercises(template_id, order_index);

COMMENT ON INDEX idx_photos_type IS 'Speeds up filtering progress photos by type';
COMMENT ON INDEX idx_weight_goals_active IS 'Speeds up finding active (unachieved) goals';
COMMENT ON INDEX idx_personal_records_achieved IS 'Speeds up finding recent personal records';

