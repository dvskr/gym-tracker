-- Create template_folders table
CREATE TABLE IF NOT EXISTS template_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6', -- hex color for folder icon
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_template_folders_user_id ON template_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_template_folders_order ON template_folders(order_index);

-- Enable Row Level Security
ALTER TABLE template_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own folders
CREATE POLICY "Users own folders" ON template_folders 
  FOR ALL USING (auth.uid() = user_id);

-- Update workout_templates to reference folders (if not already done)
-- The folder_id column was added in a previous migration, but let's ensure the FK exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'workout_templates_folder_id_fkey'
  ) THEN
    ALTER TABLE workout_templates 
    ADD CONSTRAINT workout_templates_folder_id_fkey 
    FOREIGN KEY (folder_id) REFERENCES template_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

