-- =============================================
-- EQUIPMENT PREFERENCES
-- Track user's available gym equipment for personalized suggestions
-- =============================================

-- Add equipment preference columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gym_type TEXT DEFAULT 'commercial_gym'
  CHECK (gym_type IN ('commercial_gym', 'home_gym', 'minimal', 'bodyweight_only'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_equipment TEXT[] DEFAULT ARRAY[
  'barbell', 'dumbbells', 'cables', 'machines', 'pull_up_bar'
];

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get user equipment setup
CREATE OR REPLACE FUNCTION get_equipment_setup(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_setup JSONB;
BEGIN
  SELECT jsonb_build_object(
    'gym_type', gym_type,
    'available_equipment', available_equipment
  ) INTO v_setup
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(v_setup, '{"gym_type":"commercial_gym","available_equipment":[]}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has specific equipment
CREATE OR REPLACE FUNCTION has_equipment(p_user_id UUID, p_equipment TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_equipment TEXT[];
BEGIN
  SELECT available_equipment INTO v_equipment
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN p_equipment = ANY(v_equipment);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- EQUIPMENT PRESETS
-- =============================================

-- Function to set equipment based on gym type
CREATE OR REPLACE FUNCTION apply_gym_type_preset(p_user_id UUID, p_gym_type TEXT)
RETURNS VOID AS $$
DECLARE
  v_equipment TEXT[];
BEGIN
  -- Set equipment based on gym type
  CASE p_gym_type
    WHEN 'commercial_gym' THEN
      v_equipment := ARRAY[
        'barbell', 'dumbbells', 'kettlebells', 'cables', 'machines',
        'pull_up_bar', 'dip_bars', 'bench', 'squat_rack', 'leg_press',
        'smith_machine', 'ez_bar', 'trap_bar', 'resistance_bands'
      ];
    WHEN 'home_gym' THEN
      v_equipment := ARRAY[
        'barbell', 'dumbbells', 'bench', 'squat_rack', 'pull_up_bar', 'resistance_bands'
      ];
    WHEN 'minimal' THEN
      v_equipment := ARRAY[
        'dumbbells', 'resistance_bands', 'pull_up_bar'
      ];
    WHEN 'bodyweight_only' THEN
      v_equipment := ARRAY[
        'pull_up_bar', 'dip_bars'
      ];
    ELSE
      v_equipment := ARRAY[]::TEXT[];
  END CASE;

  -- Update profile
  UPDATE profiles
  SET 
    gym_type = p_gym_type,
    available_equipment = v_equipment,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN profiles.gym_type IS 'Type of gym access: commercial_gym, home_gym, minimal, bodyweight_only';
COMMENT ON COLUMN profiles.available_equipment IS 'Array of available equipment types';

COMMENT ON FUNCTION get_equipment_setup IS 'Get user gym type and available equipment';
COMMENT ON FUNCTION has_equipment IS 'Check if user has specific equipment available';
COMMENT ON FUNCTION apply_gym_type_preset IS 'Apply equipment preset based on gym type';

