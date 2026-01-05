-- Add missing indexes for foreign keys and frequently queried columns
-- These indexes significantly improve JOIN performance and WHERE clause filtering

-- ============================================
-- EXERCISES TABLE
-- ============================================
-- Index on created_by for filtering custom exercises by creator
CREATE INDEX IF NOT EXISTS idx_exercises_created_by 
  ON exercises(created_by);

-- ============================================
-- PERSONAL_RECORDS TABLE
-- ============================================
-- Index on workout_id for looking up PRs achieved in a specific workout
CREATE INDEX IF NOT EXISTS idx_personal_records_workout_id 
  ON personal_records(workout_id);

-- ============================================
-- TEMPLATE_EXERCISES TABLE
-- ============================================
-- Index on exercise_id for finding which templates use a specific exercise
CREATE INDEX IF NOT EXISTS idx_template_exercises_exercise_id 
  ON template_exercises(exercise_id);

-- ============================================
-- EXERCISE_FAVORITES TABLE
-- ============================================
-- Index on exercise_id for finding all users who favorited an exercise
CREATE INDEX IF NOT EXISTS idx_exercise_favorites_exercise_id 
  ON exercise_favorites(exercise_id);

-- ============================================
-- WORKOUT_EXERCISES TABLE
-- ============================================
-- Index on exercise_id for finding all workouts that used a specific exercise
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id 
  ON workout_exercises(exercise_id);

-- ============================================
-- WORKOUT_TEMPLATES TABLE
-- ============================================
-- Index on folder_id for listing templates in a specific folder
CREATE INDEX IF NOT EXISTS idx_workout_templates_folder_id 
  ON workout_templates(folder_id);

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this query to see all indexes:
--
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

