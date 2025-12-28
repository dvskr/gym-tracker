-- Create user_devices table for multi-device support
CREATE TABLE IF NOT EXISTS user_devices (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  app_version TEXT,
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can manage their own devices
CREATE POLICY "Users can read own devices"
ON user_devices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own devices"
ON user_devices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
ON user_devices FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
ON user_devices FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_active ON user_devices(last_active DESC);

-- Add device_id to workouts table (optional but useful for tracking)
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS device_id TEXT;
CREATE INDEX IF NOT EXISTS idx_workouts_device_id ON workouts(device_id);

