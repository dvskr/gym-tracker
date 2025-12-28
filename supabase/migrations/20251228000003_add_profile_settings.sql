-- Add additional settings columns to profiles
-- These columns store user preferences for the app

-- Unit preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'lbs';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS measurement_unit TEXT DEFAULT 'in';

-- Timer and sound settings
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_start_timer BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS haptic_enabled BOOLEAN DEFAULT true;

-- Notification settings
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS workout_reminders BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_days TEXT[] DEFAULT '{"mon","wed","fri"}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_time TIME DEFAULT '09:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_reminders BOOLEAN DEFAULT true;

-- Workout preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pr_celebrations BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_previous_workout BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_plates TEXT DEFAULT 'standard';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS barbell_weight DECIMAL(5,2) DEFAULT 45;

-- Add check constraints for data validation
ALTER TABLE profiles ADD CONSTRAINT profiles_weight_unit_check 
  CHECK (weight_unit IN ('lbs', 'kg'));

ALTER TABLE profiles ADD CONSTRAINT profiles_measurement_unit_check 
  CHECK (measurement_unit IN ('in', 'cm'));

ALTER TABLE profiles ADD CONSTRAINT profiles_barbell_weight_positive 
  CHECK (barbell_weight > 0);

COMMENT ON COLUMN profiles.weight_unit IS 'User preference for weight unit (lbs or kg)';
COMMENT ON COLUMN profiles.measurement_unit IS 'User preference for body measurements (in or cm)';
COMMENT ON COLUMN profiles.auto_start_timer IS 'Automatically start rest timer after completing a set';
COMMENT ON COLUMN profiles.sound_enabled IS 'Enable sound effects';
COMMENT ON COLUMN profiles.haptic_enabled IS 'Enable haptic feedback';
COMMENT ON COLUMN profiles.notifications_enabled IS 'Master notification toggle';
COMMENT ON COLUMN profiles.workout_reminders IS 'Send workout reminder notifications';
COMMENT ON COLUMN profiles.reminder_days IS 'Days of week for workout reminders (mon, tue, wed, thu, fri, sat, sun)';
COMMENT ON COLUMN profiles.reminder_time IS 'Time of day for workout reminders';
COMMENT ON COLUMN profiles.streak_reminders IS 'Send notifications about workout streaks';
COMMENT ON COLUMN profiles.pr_celebrations IS 'Show celebration animations when achieving PRs';
COMMENT ON COLUMN profiles.show_previous_workout IS 'Display previous workout data during active workout';
COMMENT ON COLUMN profiles.default_plates IS 'Default plate set for plate calculator (standard, metric, custom)';
COMMENT ON COLUMN profiles.barbell_weight IS 'Default barbell weight in user preferred unit';

