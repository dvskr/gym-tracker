-- Body Weight Log
CREATE TABLE body_weight_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  logged_at DATE NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  weight_unit TEXT DEFAULT 'lbs',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, logged_at)
);

-- Body Measurements
CREATE TABLE body_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  measured_at DATE NOT NULL,
  weight DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  chest DECIMAL(5,2),
  waist DECIMAL(5,2),
  hips DECIMAL(5,2),
  bicep_left DECIMAL(5,2),
  bicep_right DECIMAL(5,2),
  thigh_left DECIMAL(5,2),
  thigh_right DECIMAL(5,2),
  calf_left DECIMAL(5,2),
  calf_right DECIMAL(5,2),
  shoulders DECIMAL(5,2),
  neck DECIMAL(5,2),
  forearm_left DECIMAL(5,2),
  forearm_right DECIMAL(5,2),
  notes TEXT,
  unit TEXT DEFAULT 'in',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, measured_at)
);

-- Progress Photos
CREATE TABLE progress_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  taken_at DATE NOT NULL,
  photo_type TEXT NOT NULL, -- 'front', 'side', 'back', 'flexed'
  local_uri TEXT NOT NULL,
  cloud_uri TEXT,
  notes TEXT,
  is_synced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weight Goals
CREATE TABLE weight_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_weight DECIMAL(5,2) NOT NULL,
  weight_unit TEXT DEFAULT 'lbs',
  target_date DATE,
  goal_type TEXT DEFAULT 'lose', -- 'lose', 'gain', 'maintain'
  start_weight DECIMAL(5,2),
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  achieved_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_weight_log_user ON body_weight_log(user_id, logged_at DESC);
CREATE INDEX idx_measurements_user ON body_measurements(user_id, measured_at DESC);
CREATE INDEX idx_photos_user ON progress_photos(user_id, taken_at DESC);

-- RLS Policies
ALTER TABLE body_weight_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own weight logs" ON body_weight_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own measurements" ON body_measurements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own photos" ON progress_photos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own goals" ON weight_goals FOR ALL USING (auth.uid() = user_id);

