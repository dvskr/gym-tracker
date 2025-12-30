-- User exercise favorites table
CREATE TABLE IF NOT EXISTS user_exercise_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- Enable RLS
ALTER TABLE user_exercise_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own favorites
CREATE POLICY "Users manage own favorites"
  ON user_exercise_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_favorites 
ON user_exercise_favorites(user_id, exercise_id);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_favorites_user
ON user_exercise_favorites(user_id);

-- Comment
COMMENT ON TABLE user_exercise_favorites IS 'Tracks user-favorited exercises for quick access';

