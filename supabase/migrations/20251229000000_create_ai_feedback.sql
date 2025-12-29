-- =============================================
-- AI FEEDBACK TABLE
-- Track user feedback (thumbs up/down) on AI responses
-- =============================================

-- Create ai_feedback table
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ai_usage_id UUID REFERENCES ai_usage(id) ON DELETE SET NULL,
  feature TEXT NOT NULL, -- 'workout_suggestion', 'form_tips', 'recovery', 'analysis', 'chat', 'weight_suggestion'
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  context JSONB, -- Optional: what was shown, user's workout state, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user 
  ON ai_feedback(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_feature 
  ON ai_feedback(feature);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating 
  ON ai_feedback(rating);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_ai_usage 
  ON ai_feedback(ai_usage_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON ai_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON ai_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own feedback (in case they want to change their mind)
CREATE POLICY "Users can update own feedback"
  ON ai_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE ai_feedback IS 'User feedback (thumbs up/down) on AI-generated responses';
COMMENT ON COLUMN ai_feedback.feature IS 'Which AI feature the feedback is for';
COMMENT ON COLUMN ai_feedback.rating IS 'User rating: positive or negative';
COMMENT ON COLUMN ai_feedback.context IS 'Optional context about what was shown and user state';
COMMENT ON COLUMN ai_feedback.ai_usage_id IS 'Optional link to the AI request that generated this response';

