-- AI Quality Analytics Tables
-- Tracks AI response quality, validation metrics, and performance

-- ==========================================
-- AI Quality Logs Table
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_quality_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Identification
  feature TEXT NOT NULL,                    -- 'workout_suggestion', 'form_tips', 'coach_chat', etc.
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Specificity metrics
  specificity_score INTEGER NOT NULL,       -- 0-100+
  has_specific_weight BOOLEAN DEFAULT FALSE,
  has_specific_reps BOOLEAN DEFAULT FALSE,
  exercises_mentioned INTEGER DEFAULT 0,
  has_time_reference BOOLEAN DEFAULT FALSE,
  
  -- Exercise validation metrics
  exercises_validated INTEGER DEFAULT 0,
  exercises_filtered INTEGER DEFAULT 0,
  filter_reasons TEXT[] DEFAULT '{}',       -- ['invalid_name', 'no_equipment', 'injury']
  
  -- Context metrics
  is_new_user BOOLEAN DEFAULT FALSE,
  had_workout_data BOOLEAN DEFAULT FALSE,
  had_injuries BOOLEAN DEFAULT FALSE,
  context_warnings TEXT[] DEFAULT '{}',     -- ['NEW_USER_NO_DATA', 'ACTIVE_INJURIES']
  
  -- Response quality
  used_fallback BOOLEAN DEFAULT FALSE,
  was_generic BOOLEAN DEFAULT FALSE,
  response_length INTEGER DEFAULT 0,
  response_time INTEGER NOT NULL,           -- Milliseconds
  
  -- AI model info
  model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  
  -- Metadata (truncated for storage)
  prompt_preview TEXT,                      -- First 500 chars
  response_preview TEXT,                    -- First 500 chars
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX idx_ai_quality_logs_timestamp ON ai_quality_logs(timestamp DESC);
CREATE INDEX idx_ai_quality_logs_user_id ON ai_quality_logs(user_id);
CREATE INDEX idx_ai_quality_logs_feature ON ai_quality_logs(feature);
CREATE INDEX idx_ai_quality_logs_specificity ON ai_quality_logs(specificity_score);
CREATE INDEX idx_ai_quality_logs_fallback ON ai_quality_logs(used_fallback);

-- RLS Policies
ALTER TABLE ai_quality_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view all quality logs"
  ON ai_quality_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Users can view their own logs
CREATE POLICY "Users can view own quality logs"
  ON ai_quality_logs FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert (called from app)
CREATE POLICY "Service can insert quality logs"
  ON ai_quality_logs FOR INSERT
  WITH CHECK (TRUE);

-- ==========================================
-- AI Quality Alerts Table
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_quality_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  type TEXT NOT NULL,                       -- 'LOW_SPECIFICITY', 'HIGH_FILTER_RATE', etc.
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Resolution tracking
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT
);

-- Indexes
CREATE INDEX idx_ai_quality_alerts_timestamp ON ai_quality_alerts(timestamp DESC);
CREATE INDEX idx_ai_quality_alerts_severity ON ai_quality_alerts(severity);
CREATE INDEX idx_ai_quality_alerts_type ON ai_quality_alerts(type);
CREATE INDEX idx_ai_quality_alerts_resolved ON ai_quality_alerts(resolved);

-- RLS Policies
ALTER TABLE ai_quality_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage alerts
CREATE POLICY "Admins can view all alerts"
  ON ai_quality_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update alerts"
  ON ai_quality_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Service role can insert
CREATE POLICY "Service can insert alerts"
  ON ai_quality_alerts FOR INSERT
  WITH CHECK (TRUE);

-- ==========================================
-- Useful Views
-- ==========================================

-- Daily quality summary
CREATE OR REPLACE VIEW ai_quality_daily_summary AS
SELECT 
  DATE(timestamp) as date,
  feature,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE NOT used_fallback) as successful_requests,
  COUNT(*) FILTER (WHERE used_fallback) as fallback_count,
  AVG(specificity_score)::INTEGER as avg_specificity_score,
  AVG(response_time)::INTEGER as avg_response_time,
  SUM(exercises_validated) as total_exercises_validated,
  SUM(exercises_filtered) as total_exercises_filtered,
  (SUM(exercises_filtered)::FLOAT / NULLIF(SUM(exercises_validated), 0) * 100)::NUMERIC(5,2) as filter_rate_pct,
  (COUNT(*) FILTER (WHERE was_generic)::FLOAT / COUNT(*) * 100)::NUMERIC(5,2) as generic_rate_pct,
  (COUNT(*) FILTER (WHERE is_new_user)::FLOAT / COUNT(*) * 100)::NUMERIC(5,2) as new_user_rate_pct,
  (COUNT(*) FILTER (WHERE had_injuries)::FLOAT / COUNT(*) * 100)::NUMERIC(5,2) as injury_rate_pct
FROM ai_quality_logs
GROUP BY DATE(timestamp), feature
ORDER BY date DESC, feature;

-- Recent quality issues
CREATE OR REPLACE VIEW ai_quality_recent_issues AS
SELECT 
  timestamp,
  feature,
  user_id,
  specificity_score,
  exercises_filtered,
  used_fallback,
  context_warnings,
  error_message
FROM ai_quality_logs
WHERE 
  specificity_score < 30 
  OR used_fallback = TRUE 
  OR exercises_filtered > exercises_validated * 0.5
ORDER BY timestamp DESC
LIMIT 100;

-- Alert summary
CREATE OR REPLACE VIEW ai_quality_alert_summary AS
SELECT 
  type,
  severity,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE NOT resolved) as unresolved_count,
  MAX(timestamp) as last_occurrence
FROM ai_quality_alerts
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY type, severity
ORDER BY unresolved_count DESC, count DESC;

-- ==========================================
-- Helper Functions
-- ==========================================

-- Function to get quality stats for a period
CREATE OR REPLACE FUNCTION get_ai_quality_stats(
  period_hours INTEGER DEFAULT 24,
  filter_feature TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_requests BIGINT,
  successful_requests BIGINT,
  fallback_count BIGINT,
  avg_specificity_score NUMERIC,
  avg_response_time NUMERIC,
  exercises_validated BIGINT,
  exercises_filtered BIGINT,
  filter_rate NUMERIC,
  generic_rate NUMERIC,
  new_user_rate NUMERIC,
  injury_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE NOT used_fallback)::BIGINT,
    COUNT(*) FILTER (WHERE used_fallback)::BIGINT,
    AVG(specificity_score)::NUMERIC(5,2),
    AVG(response_time)::NUMERIC(8,2),
    SUM(exercises_validated)::BIGINT,
    SUM(exercises_filtered)::BIGINT,
    (SUM(exercises_filtered)::FLOAT / NULLIF(SUM(exercises_validated), 0) * 100)::NUMERIC(5,2),
    (COUNT(*) FILTER (WHERE was_generic)::FLOAT / COUNT(*) * 100)::NUMERIC(5,2),
    (COUNT(*) FILTER (WHERE is_new_user)::FLOAT / COUNT(*) * 100)::NUMERIC(5,2),
    (COUNT(*) FILTER (WHERE had_injuries)::FLOAT / COUNT(*) * 100)::NUMERIC(5,2)
  FROM ai_quality_logs
  WHERE 
    timestamp > NOW() - (period_hours || ' hours')::INTERVAL
    AND (filter_feature IS NULL OR feature = filter_feature);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Comments
-- ==========================================

COMMENT ON TABLE ai_quality_logs IS 'Tracks AI response quality metrics for monitoring and improvement';
COMMENT ON TABLE ai_quality_alerts IS 'Alerts for quality issues that need attention';
COMMENT ON VIEW ai_quality_daily_summary IS 'Daily aggregated quality metrics by feature';
COMMENT ON VIEW ai_quality_recent_issues IS 'Recent low-quality responses for investigation';
COMMENT ON VIEW ai_quality_alert_summary IS 'Summary of alerts by type and severity';
COMMENT ON FUNCTION get_ai_quality_stats IS 'Get aggregated quality statistics for a time period';

