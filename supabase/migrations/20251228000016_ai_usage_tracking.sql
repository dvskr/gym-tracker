-- =============================================
-- AI USAGE TRACKING TABLES
-- Track AI requests, costs, and enforce limits
-- =============================================

-- 1. Detailed AI request log
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_type TEXT NOT NULL, -- 'workout_suggestion', 'form_tips', 'chat', 'analysis', etc.
  tokens_used INTEGER DEFAULT 0,
  cost_cents NUMERIC(10,4) DEFAULT 0,
  model TEXT DEFAULT 'gpt-4o-mini',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Daily summary for fast limit checks
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_cents NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 3. Monthly summary for billing/analytics
CREATE TABLE IF NOT EXISTS ai_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL, -- First day of month
  request_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_cents NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- 4. Add subscription fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_requests_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_requests_today_date DATE DEFAULT CURRENT_DATE;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created 
  ON ai_usage(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_user_date 
  ON ai_usage_daily(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_monthly_user_month 
  ON ai_usage_monthly(user_id, month DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier
  ON profiles(subscription_tier);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function: Check if user can make AI request
CREATE OR REPLACE FUNCTION can_use_ai(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tier TEXT;
  v_today_count INTEGER;
  v_today_date DATE;
  v_daily_limit INTEGER;
  v_expires_at TIMESTAMPTZ;
  v_is_premium BOOLEAN;
BEGIN
  -- Get user's subscription info
  SELECT 
    COALESCE(subscription_tier, 'free'),
    subscription_expires_at,
    COALESCE(ai_requests_today, 0),
    ai_requests_today_date
  INTO v_tier, v_expires_at, v_today_count, v_today_date
  FROM profiles 
  WHERE id = p_user_id;

  -- Check if premium has expired
  v_is_premium := v_tier = 'premium' AND (v_expires_at IS NULL OR v_expires_at > NOW());
  
  IF NOT v_is_premium THEN
    v_tier := 'free';
  END IF;

  -- Reset counter if new day
  IF v_today_date IS NULL OR v_today_date < CURRENT_DATE THEN
    v_today_count := 0;
    UPDATE profiles 
    SET ai_requests_today = 0, ai_requests_today_date = CURRENT_DATE
    WHERE id = p_user_id;
  END IF;

  -- Set limit based on tier
  v_daily_limit := CASE 
    WHEN v_is_premium THEN 100
    ELSE 10
  END;

  RETURN jsonb_build_object(
    'allowed', v_today_count < v_daily_limit,
    'used', v_today_count,
    'limit', v_daily_limit,
    'remaining', GREATEST(0, v_daily_limit - v_today_count),
    'tier', v_tier,
    'is_premium', v_is_premium
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log AI usage
CREATE OR REPLACE FUNCTION log_ai_usage(
  p_user_id UUID,
  p_request_type TEXT,
  p_tokens INTEGER,
  p_cost_cents NUMERIC,
  p_model TEXT DEFAULT 'gpt-4o-mini',
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_month_start DATE;
BEGIN
  -- 1. Insert detailed log
  INSERT INTO ai_usage (user_id, request_type, tokens_used, cost_cents, model, success, error_message)
  VALUES (p_user_id, p_request_type, p_tokens, p_cost_cents, p_model, p_success, p_error_message);

  -- 2. Update daily summary
  INSERT INTO ai_usage_daily (user_id, date, request_count, tokens_used, cost_cents)
  VALUES (p_user_id, CURRENT_DATE, 1, p_tokens, p_cost_cents)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    request_count = ai_usage_daily.request_count + 1,
    tokens_used = ai_usage_daily.tokens_used + EXCLUDED.tokens_used,
    cost_cents = ai_usage_daily.cost_cents + EXCLUDED.cost_cents,
    updated_at = NOW();

  -- 3. Update monthly summary
  v_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  INSERT INTO ai_usage_monthly (user_id, month, request_count, tokens_used, cost_cents)
  VALUES (p_user_id, v_month_start, 1, p_tokens, p_cost_cents)
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    request_count = ai_usage_monthly.request_count + 1,
    tokens_used = ai_usage_monthly.tokens_used + EXCLUDED.tokens_used,
    cost_cents = ai_usage_monthly.cost_cents + EXCLUDED.cost_cents;

  -- 4. Update profile counter (for fast checks)
  UPDATE profiles 
  SET 
    ai_requests_today = COALESCE(ai_requests_today, 0) + 1,
    ai_requests_today_date = CURRENT_DATE
  WHERE id = p_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's AI usage stats
CREATE OR REPLACE FUNCTION get_ai_usage_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_today JSONB;
  v_month JSONB;
  v_all_time JSONB;
BEGIN
  -- Today's stats
  SELECT jsonb_build_object(
    'requests', COALESCE(request_count, 0),
    'tokens', COALESCE(tokens_used, 0),
    'cost_cents', COALESCE(cost_cents, 0)
  ) INTO v_today
  FROM ai_usage_daily
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  -- This month's stats
  SELECT jsonb_build_object(
    'requests', COALESCE(request_count, 0),
    'tokens', COALESCE(tokens_used, 0),
    'cost_cents', COALESCE(cost_cents, 0)
  ) INTO v_month
  FROM ai_usage_monthly
  WHERE user_id = p_user_id AND month = DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- All time stats
  SELECT jsonb_build_object(
    'requests', COALESCE(SUM(request_count), 0),
    'tokens', COALESCE(SUM(tokens_used), 0),
    'cost_cents', COALESCE(SUM(cost_cents), 0)
  ) INTO v_all_time
  FROM ai_usage_monthly
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'today', COALESCE(v_today, '{"requests":0,"tokens":0,"cost_cents":0}'::jsonb),
    'month', COALESCE(v_month, '{"requests":0,"tokens":0,"cost_cents":0}'::jsonb),
    'all_time', COALESCE(v_all_time, '{"requests":0,"tokens":0,"cost_cents":0}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_monthly ENABLE ROW LEVEL SECURITY;

-- Users can only view their own usage
CREATE POLICY "Users can view own ai_usage" ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own ai_usage_daily" ON ai_usage_daily
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own ai_usage_monthly" ON ai_usage_monthly
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE ai_usage IS 'Detailed log of every AI request made by users';
COMMENT ON TABLE ai_usage_daily IS 'Daily aggregated AI usage for fast limit checks';
COMMENT ON TABLE ai_usage_monthly IS 'Monthly aggregated AI usage for billing and analytics';

COMMENT ON FUNCTION can_use_ai IS 'Check if user has remaining AI requests for today';
COMMENT ON FUNCTION log_ai_usage IS 'Log an AI request and update all summaries atomically';
COMMENT ON FUNCTION get_ai_usage_stats IS 'Get user AI usage stats for today, this month, and all time';

