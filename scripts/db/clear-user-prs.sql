-- Clear all workout history and PRs for dvskr.1234@gmail.com
-- This will allow fresh PR testing

-- Delete personal records
DELETE FROM personal_records 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'dvskr.1234@gmail.com');

-- Delete workout sets
DELETE FROM workout_sets 
WHERE workout_exercise_id IN (
  SELECT id FROM workout_exercises 
  WHERE workout_id IN (
    SELECT id FROM workouts 
    WHERE user_id = (SELECT id FROM profiles WHERE email = 'dvskr.1234@gmail.com')
  )
);

-- Delete workout exercises
DELETE FROM workout_exercises 
WHERE workout_id IN (
  SELECT id FROM workouts 
  WHERE user_id = (SELECT id FROM profiles WHERE email = 'dvskr.1234@gmail.com')
);

-- Delete workouts
DELETE FROM workouts 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'dvskr.1234@gmail.com');

-- Confirm deletion
SELECT 
  (SELECT COUNT(*) FROM personal_records WHERE user_id = (SELECT id FROM profiles WHERE email = 'dvskr.1234@gmail.com')) as pr_count,
  (SELECT COUNT(*) FROM workouts WHERE user_id = (SELECT id FROM profiles WHERE email = 'dvskr.1234@gmail.com')) as workout_count;

