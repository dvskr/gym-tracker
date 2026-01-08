-- ============================================
-- Achievement System V2 Migration
-- Adds cached stats for performance
-- ============================================

-- Add achievement_stats JSONB column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS achievement_stats JSONB DEFAULT '{
  "totalWorkouts": 0,
  "currentStreak": 0,
  "longestStreak": 0,
  "totalVolume": 0,
  "uniqueExercises": 0,
  "totalPRs": 0,
  "weekendWorkouts": 0,
  "earlyWorkouts": 0,
  "lateWorkouts": 0,
  "legWorkouts": 0,
  "pushWorkouts": 0,
  "pullWorkouts": 0,
  "fullBodyWorkouts": 0,
  "perfectWeeks": 0,
  "consecutiveWeeksWithWorkout": 0,
  "consecutiveMonthsWithWorkout": 0,
  "maxWorkoutVolume": 0,
  "maxWorkoutReps": 0,
  "maxWorkoutDuration": 0,
  "minWorkoutDuration": 999999,
  "lastUpdated": null
}'::jsonb;

-- Create GIN index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_profiles_achievement_stats 
ON profiles USING GIN (achievement_stats);

-- Add index on user_achievements for earned_at queries
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at 
ON user_achievements(user_id, earned_at DESC);

-- Add index for faster achievement lookups
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_achievement 
ON user_achievements(user_id, achievement_id);

