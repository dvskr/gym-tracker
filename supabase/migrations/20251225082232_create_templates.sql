CREATE TABLE workout_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_muscles TEXT[] DEFAULT '{}',
  times_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE template_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES workout_templates(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  order_index INTEGER NOT NULL,
  target_sets INTEGER DEFAULT 3,
  target_reps_min INTEGER DEFAULT 8,
  target_reps_max INTEGER DEFAULT 12,
  rest_seconds INTEGER DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_user_id ON workout_templates(user_id);

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own templates" ON workout_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access template exercises" ON template_exercises FOR ALL 
  USING (EXISTS (SELECT 1 FROM workout_templates WHERE workout_templates.id = template_exercises.template_id AND workout_templates.user_id = auth.uid()));

