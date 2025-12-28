-- Create template_sets table for individual set targets
CREATE TABLE IF NOT EXISTS template_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_exercise_id UUID REFERENCES template_exercises(id) ON DELETE CASCADE NOT NULL,
  set_number INTEGER NOT NULL,
  target_weight DECIMAL(7,2),
  weight_unit TEXT DEFAULT 'lbs',
  target_reps INTEGER NOT NULL DEFAULT 10,
  set_type TEXT DEFAULT 'normal' CHECK (set_type IN ('normal', 'warmup', 'dropset', 'failure')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_template_sets_exercise_id ON template_sets(template_exercise_id);

-- Enable RLS
ALTER TABLE template_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access sets for their template exercises
CREATE POLICY "Users access template sets" ON template_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM template_exercises te
      JOIN workout_templates wt ON wt.id = te.template_id
      WHERE te.id = template_sets.template_exercise_id
      AND wt.user_id = auth.uid()
    )
  );

