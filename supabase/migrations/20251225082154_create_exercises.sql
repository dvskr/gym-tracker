CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT[],
  primary_muscles TEXT[] NOT NULL,
  secondary_muscles TEXT[] DEFAULT '{}',
  equipment TEXT,
  category TEXT,
  difficulty TEXT,
  gif_url TEXT,
  is_custom BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercises_primary_muscles ON exercises USING GIN(primary_muscles);
CREATE INDEX idx_exercises_equipment ON exercises(equipment);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view exercises" ON exercises FOR SELECT USING (true);
CREATE POLICY "Users create custom exercises" ON exercises FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own exercises" ON exercises FOR UPDATE USING (auth.uid() = created_by AND is_custom = true);
CREATE POLICY "Users delete own exercises" ON exercises FOR DELETE USING (auth.uid() = created_by AND is_custom = true);

