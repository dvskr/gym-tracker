-- Create coach_messages table for chat history
CREATE TABLE coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own messages
CREATE POLICY "Users can manage own coach messages"
  ON coach_messages FOR ALL
  USING (auth.uid() = user_id);

-- Index for fast retrieval
CREATE INDEX idx_coach_messages_user_time 
  ON coach_messages(user_id, created_at DESC);

-- Function to get recent messages efficiently
CREATE OR REPLACE FUNCTION get_recent_coach_messages(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
AS $$
  SELECT id, role, content, created_at
  FROM coach_messages
  WHERE user_id = p_user_id
  ORDER BY created_at ASC
  LIMIT p_limit;
$$;

