-- =============================================
-- FITNESS PREFERENCES
-- Add user fitness goals and training preferences to profiles
-- =============================================

-- Add fitness preference columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_goal TEXT 
  CHECK (fitness_goal IN ('build_muscle', 'lose_fat', 'maintain', 'strength', 'endurance', 'general_fitness'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_workout_target INTEGER DEFAULT 4
  CHECK (weekly_workout_target BETWEEN 1 AND 7);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_rest_days TEXT[] DEFAULT ARRAY['sunday'];

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'intermediate'
  CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS training_split TEXT
  CHECK (training_split IN ('full_body', 'upper_lower', 'push_pull_legs', 'bro_split', 'custom'));

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get user fitness profile
CREATE OR REPLACE FUNCTION get_fitness_profile(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile JSONB;
BEGIN
  SELECT jsonb_build_object(
    'fitness_goal', fitness_goal,
    'weekly_workout_target', weekly_workout_target,
    'preferred_rest_days', preferred_rest_days,
    'experience_level', experience_level,
    'training_split', training_split
  ) INTO v_profile
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(v_profile, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN profiles.fitness_goal IS 'Primary fitness goal: build_muscle, lose_fat, maintain, strength, endurance, general_fitness';
COMMENT ON COLUMN profiles.weekly_workout_target IS 'Target number of workouts per week (1-7)';
COMMENT ON COLUMN profiles.preferred_rest_days IS 'Array of preferred rest days (monday, tuesday, etc.)';
COMMENT ON COLUMN profiles.experience_level IS 'Training experience level: beginner, intermediate, advanced';
COMMENT ON COLUMN profiles.training_split IS 'Preferred training split: full_body, upper_lower, push_pull_legs, bro_split, custom';

