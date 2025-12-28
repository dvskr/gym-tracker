-- Create backups storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for backups bucket
CREATE POLICY "Users can upload own backups"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'backups' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own backups"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'backups' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own backups"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'backups' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create user_backups metadata table
CREATE TABLE IF NOT EXISTS user_backups (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  size_bytes INTEGER NOT NULL,
  version TEXT NOT NULL,
  file_path TEXT NOT NULL,
  is_automatic BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE user_backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_backups
CREATE POLICY "Users can read own backups"
ON user_backups FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own backups"
ON user_backups FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own backups"
ON user_backups FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_backups_user_id ON user_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_backups_created_at ON user_backups(created_at DESC);

