-- =============================================
-- USER INJURIES AND LIMITATIONS
-- Track injuries, limitations, and movement restrictions
-- =============================================

-- Create user_injuries table
CREATE TABLE IF NOT EXISTS user_injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Injury details
  body_part TEXT NOT NULL, -- shoulder, lower_back, knee, wrist, elbow, ankle, hip, neck
  injury_type TEXT, -- strain, tendinitis, surgery, chronic, arthritis, impingement
  severity TEXT DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe')),
  
  -- Restrictions
  avoid_exercises TEXT[], -- specific exercises to avoid by name
  avoid_movements TEXT[], -- movement patterns: overhead_press, heavy_squat, deadlift, etc.
  
  -- Additional info
  notes TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE, -- null if ongoing
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_user_injuries_user_active 
  ON user_injuries(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_user_injuries_body_part 
  ON user_injuries(body_part) WHERE is_active = true;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE user_injuries ENABLE ROW LEVEL SECURITY;

-- Users can manage their own injuries
CREATE POLICY "Users can manage own injuries"
  ON user_injuries FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- TRIGGER FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_user_injuries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_injuries_updated_at
  BEFORE UPDATE ON user_injuries
  FOR EACH ROW
  EXECUTE FUNCTION update_user_injuries_updated_at();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get all active injuries for user
CREATE OR REPLACE FUNCTION get_active_injuries(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'body_part', body_part,
      'injury_type', injury_type,
      'severity', severity,
      'avoid_exercises', avoid_exercises,
      'avoid_movements', avoid_movements,
      'notes', notes,
      'start_date', start_date
    )
  ) INTO v_result
  FROM user_injuries
  WHERE user_id = p_user_id
    AND is_active = true
  ORDER BY created_at DESC;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all exercises to avoid for user
CREATE OR REPLACE FUNCTION get_avoided_exercises(p_user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  v_exercises TEXT[];
BEGIN
  SELECT array_agg(DISTINCT e)
  INTO v_exercises
  FROM user_injuries,
       LATERAL unnest(avoid_exercises) AS e
  WHERE user_id = p_user_id
    AND is_active = true;
  
  RETURN COALESCE(v_exercises, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all movements to avoid for user
CREATE OR REPLACE FUNCTION get_avoided_movements(p_user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  v_movements TEXT[];
BEGIN
  SELECT array_agg(DISTINCT m)
  INTO v_movements
  FROM user_injuries,
       LATERAL unnest(avoid_movements) AS m
  WHERE user_id = p_user_id
    AND is_active = true;
  
  RETURN COALESCE(v_movements, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if exercise should be avoided
CREATE OR REPLACE FUNCTION should_avoid_exercise(
  p_user_id UUID,
  p_exercise_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM user_injuries
  WHERE user_id = p_user_id
    AND is_active = true
    AND p_exercise_name = ANY(avoid_exercises);
  
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE user_injuries IS 'User injuries, limitations, and movement restrictions for safe training';
COMMENT ON COLUMN user_injuries.body_part IS 'Affected body part: shoulder, lower_back, knee, wrist, etc.';
COMMENT ON COLUMN user_injuries.injury_type IS 'Type: strain, tendinitis, surgery, chronic, arthritis, etc.';
COMMENT ON COLUMN user_injuries.severity IS 'Severity level: mild, moderate, severe';
COMMENT ON COLUMN user_injuries.avoid_exercises IS 'Specific exercises to completely avoid';
COMMENT ON COLUMN user_injuries.avoid_movements IS 'Movement patterns to avoid: overhead_press, heavy_squat, etc.';
COMMENT ON COLUMN user_injuries.is_active IS 'Whether injury is currently active (ongoing)';
COMMENT ON COLUMN user_injuries.end_date IS 'Recovery date (null if ongoing)';

