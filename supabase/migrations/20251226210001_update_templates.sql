-- Update existing templates tables with new columns

-- Add missing columns to workout_templates
ALTER TABLE workout_templates 
ADD COLUMN IF NOT EXISTS estimated_duration INTEGER,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS folder_id UUID,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to template_exercises
ALTER TABLE template_exercises 
ADD COLUMN IF NOT EXISTS target_weight DECIMAL(7,2),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_workout_templates_is_archived ON workout_templates(is_archived);
CREATE INDEX IF NOT EXISTS idx_template_exercises_order ON template_exercises(template_id, order_index);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_template_updated_at ON workout_templates;
CREATE TRIGGER trigger_update_template_updated_at
  BEFORE UPDATE ON workout_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_updated_at();

