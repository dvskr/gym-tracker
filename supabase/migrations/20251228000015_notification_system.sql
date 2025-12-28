-- =============================================
-- Notification System Tables
-- =============================================

-- Add push token to profiles for sending notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

COMMENT ON COLUMN profiles.push_token IS 'Expo Push Token for sending notifications to the user';

-- =============================================
-- User Achievements Table
-- =============================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

COMMENT ON TABLE user_achievements IS 'Tracks achievements unlocked by users';
COMMENT ON COLUMN user_achievements.user_id IS 'User who earned the achievement';
COMMENT ON COLUMN user_achievements.achievement_id IS 'Unique identifier for the achievement (e.g., workouts_100, streak_30)';
COMMENT ON COLUMN user_achievements.earned_at IS 'When the achievement was earned';

-- Enable RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists first)
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can earn achievements" ON user_achievements;

CREATE POLICY "Users can view own achievements"
  ON user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can earn achievements"
  ON user_achievements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON user_achievements(user_id, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement
  ON user_achievements(achievement_id);

-- =============================================
-- Notification Events Table (Analytics)
-- =============================================

CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'received', 'opened', 'dismissed')),
  notification_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notification_events IS 'Tracks notification events for analytics';
COMMENT ON COLUMN notification_events.user_id IS 'User who received the notification';
COMMENT ON COLUMN notification_events.event_type IS 'Type of event: sent, received, opened, dismissed';
COMMENT ON COLUMN notification_events.notification_type IS 'Type of notification: workout_reminder, pr_notification, etc.';
COMMENT ON COLUMN notification_events.event_data IS 'Additional event data';

-- Enable RLS
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists first)
DROP POLICY IF EXISTS "Users can insert own notification events" ON notification_events;
DROP POLICY IF EXISTS "Users can view own notification events" ON notification_events;

CREATE POLICY "Users can insert own notification events"
  ON notification_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own notification events"
  ON notification_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_events_user_created 
  ON notification_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_events_type
  ON notification_events(notification_type, event_type);

CREATE INDEX IF NOT EXISTS idx_notification_events_user_type
  ON notification_events(user_id, notification_type);

