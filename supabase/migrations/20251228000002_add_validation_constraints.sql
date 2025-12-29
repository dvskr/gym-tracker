-- Additional validation constraints for data integrity
-- These are optional but highly recommended for production

-- Validate rating is between 1-5
ALTER TABLE workouts 
  DROP CONSTRAINT IF EXISTS workouts_rating_check;
ALTER TABLE workouts 
  ADD CONSTRAINT workouts_rating_check 
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Validate set_type values
ALTER TABLE workout_sets 
  DROP CONSTRAINT IF EXISTS workout_sets_type_check;
ALTER TABLE workout_sets 
  ADD CONSTRAINT workout_sets_type_check 
  CHECK (set_type IN ('normal', 'warmup', 'dropset', 'failure'));

-- Validate template_sets set_type values
ALTER TABLE template_sets 
  DROP CONSTRAINT IF EXISTS template_sets_type_check;
ALTER TABLE template_sets 
  ADD CONSTRAINT template_sets_type_check 
  CHECK (set_type IN ('normal', 'warmup', 'dropset', 'failure'));

-- Validate weight_unit values
ALTER TABLE workout_sets 
  DROP CONSTRAINT IF EXISTS workout_sets_weight_unit_check;
ALTER TABLE workout_sets 
  ADD CONSTRAINT workout_sets_weight_unit_check 
  CHECK (weight_unit IN ('lbs', 'kg'));

ALTER TABLE body_weight_log 
  DROP CONSTRAINT IF EXISTS body_weight_log_weight_unit_check;
ALTER TABLE body_weight_log 
  ADD CONSTRAINT body_weight_log_weight_unit_check 
  CHECK (weight_unit IN ('lbs', 'kg'));

ALTER TABLE weight_goals 
  DROP CONSTRAINT IF EXISTS weight_goals_weight_unit_check;
ALTER TABLE weight_goals 
  ADD CONSTRAINT weight_goals_weight_unit_check 
  CHECK (weight_unit IN ('lbs', 'kg'));

-- Validate measurement unit values
ALTER TABLE body_measurements 
  DROP CONSTRAINT IF EXISTS body_measurements_unit_check;
ALTER TABLE body_measurements 
  ADD CONSTRAINT body_measurements_unit_check 
  CHECK (unit IN ('in', 'cm'));

-- Validate goal_type values
ALTER TABLE weight_goals 
  DROP CONSTRAINT IF EXISTS weight_goals_type_check;
ALTER TABLE weight_goals 
  ADD CONSTRAINT weight_goals_type_check 
  CHECK (goal_type IN ('lose', 'gain', 'maintain'));

-- Validate record_type values
ALTER TABLE personal_records 
  DROP CONSTRAINT IF EXISTS personal_records_type_check;
ALTER TABLE personal_records 
  ADD CONSTRAINT personal_records_type_check 
  CHECK (record_type IN ('max_weight', 'max_reps', 'max_volume', 'max_1rm'));

-- Validate gender values (optional)
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_gender_check;
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_gender_check 
  CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Validate experience_level values (optional)
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_experience_check;
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_experience_check 
  CHECK (experience_level IS NULL OR experience_level IN ('beginner', 'intermediate', 'advanced', 'expert'));

-- Validate fitness_goal values (optional)
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_fitness_goal_check;
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_fitness_goal_check 
  CHECK (fitness_goal IS NULL OR fitness_goal IN ('lose_weight', 'gain_muscle', 'maintain', 'strength', 'endurance', 'general_fitness'));

-- Validate unit_system values
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_unit_system_check;
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_unit_system_check 
  CHECK (unit_system IN ('imperial', 'metric'));

-- Validate theme values
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_theme_check;
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_theme_check 
  CHECK (theme IN ('light', 'dark', 'system'));

-- Validate difficulty values
ALTER TABLE exercises 
  DROP CONSTRAINT IF EXISTS exercises_difficulty_check;
ALTER TABLE exercises 
  ADD CONSTRAINT exercises_difficulty_check 
  CHECK (difficulty IS NULL OR difficulty IN ('beginner', 'intermediate', 'advanced'));

-- Validate positive values
ALTER TABLE workouts 
  DROP CONSTRAINT IF EXISTS workouts_duration_positive;
ALTER TABLE workouts 
  ADD CONSTRAINT workouts_duration_positive 
  CHECK (duration_seconds IS NULL OR duration_seconds >= 0);

ALTER TABLE workouts 
  DROP CONSTRAINT IF EXISTS workouts_volume_positive;
ALTER TABLE workouts 
  ADD CONSTRAINT workouts_volume_positive 
  CHECK (total_volume IS NULL OR total_volume >= 0);

ALTER TABLE workout_sets 
  DROP CONSTRAINT IF EXISTS workout_sets_weight_positive;
ALTER TABLE workout_sets 
  ADD CONSTRAINT workout_sets_weight_positive 
  CHECK (weight IS NULL OR weight >= 0);

ALTER TABLE workout_sets 
  DROP CONSTRAINT IF EXISTS workout_sets_reps_positive;
ALTER TABLE workout_sets 
  ADD CONSTRAINT workout_sets_reps_positive 
  CHECK (reps IS NULL OR reps >= 0);

-- Validate logical date constraints
ALTER TABLE workouts 
  DROP CONSTRAINT IF EXISTS workouts_dates_logical;
ALTER TABLE workouts 
  ADD CONSTRAINT workouts_dates_logical 
  CHECK (ended_at IS NULL OR ended_at >= started_at);

ALTER TABLE weight_goals 
  DROP CONSTRAINT IF EXISTS weight_goals_dates_logical;
ALTER TABLE weight_goals 
  ADD CONSTRAINT weight_goals_dates_logical 
  CHECK (target_date IS NULL OR target_date >= start_date);

COMMENT ON TABLE workouts IS 'Stores completed workout sessions with aggregated stats';
COMMENT ON TABLE workout_exercises IS 'Exercises performed in a workout';
COMMENT ON TABLE workout_sets IS 'Individual sets (weight, reps) within workout exercises';
COMMENT ON TABLE workout_templates IS 'Saved workout templates for quick workout creation';
COMMENT ON TABLE template_exercises IS 'Exercises configured in workout templates';
COMMENT ON TABLE personal_records IS 'User personal records per exercise';
COMMENT ON TABLE body_weight_log IS 'Daily body weight tracking';
COMMENT ON TABLE body_measurements IS 'Periodic body measurement tracking';
COMMENT ON TABLE progress_photos IS 'Progress photos with local and cloud storage';
COMMENT ON TABLE weight_goals IS 'Weight loss/gain/maintenance goals';

