-- =============================================
-- DAILY CHECK-INS TABLE
-- Track daily wellness metrics: sleep, stress, soreness, energy
-- =============================================

-- Create daily_checkins table
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  
  -- Sleep metrics
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5), -- 1=terrible, 5=great
  sleep_hours DECIMAL(3,1), -- e.g., 7.5
  
  -- Wellness metrics
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5), -- 1=low, 5=high
  soreness_level INTEGER CHECK (soreness_level BETWEEN 1 AND 5), -- 1=none, 5=severe
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5), -- 1=exhausted, 5=energized
  
  -- Optional notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one check-in per user per day
  UNIQUE(user_id, date)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date 
  ON daily_checkins(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_date 
  ON daily_checkins(date DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- Users can manage their own check-ins
CREATE POLICY "Users can manage own check-ins"
  ON daily_checkins FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- TRIGGER FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_daily_checkins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_checkins_updated_at
  BEFORE UPDATE ON daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_checkins_updated_at();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get user's check-in for a specific date
CREATE OR REPLACE FUNCTION get_checkin_for_date(
  p_user_id UUID,
  p_date DATE
)
RETURNS TABLE (
  id UUID,
  sleep_quality INTEGER,
  sleep_hours DECIMAL,
  stress_level INTEGER,
  soreness_level INTEGER,
  energy_level INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.sleep_quality,
    c.sleep_hours,
    c.stress_level,
    c.soreness_level,
    c.energy_level,
    c.notes,
    c.created_at
  FROM daily_checkins c
  WHERE c.user_id = p_user_id AND c.date = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get average wellness metrics for last N days
CREATE OR REPLACE FUNCTION get_wellness_average(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'avg_sleep_quality', ROUND(AVG(sleep_quality), 1),
    'avg_sleep_hours', ROUND(AVG(sleep_hours), 1),
    'avg_stress_level', ROUND(AVG(stress_level), 1),
    'avg_soreness_level', ROUND(AVG(soreness_level), 1),
    'avg_energy_level', ROUND(AVG(energy_level), 1),
    'days_tracked', COUNT(*)
  ) INTO v_result
  FROM daily_checkins
  WHERE user_id = p_user_id
    AND date >= CURRENT_DATE - p_days
    AND date <= CURRENT_DATE;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE daily_checkins IS 'Daily wellness check-ins: sleep, stress, soreness, energy levels';
COMMENT ON COLUMN daily_checkins.sleep_quality IS '1=terrible, 2=poor, 3=okay, 4=good, 5=great';
COMMENT ON COLUMN daily_checkins.sleep_hours IS 'Hours of sleep (decimal, e.g., 7.5)';
COMMENT ON COLUMN daily_checkins.stress_level IS '1=very low, 2=low, 3=moderate, 4=high, 5=very high';
COMMENT ON COLUMN daily_checkins.soreness_level IS '1=none, 2=mild, 3=moderate, 4=significant, 5=severe';
COMMENT ON COLUMN daily_checkins.energy_level IS '1=exhausted, 2=tired, 3=okay, 4=good, 5=energized';

