-- Optimize RLS policies by caching auth.uid() with subquery
-- This significantly improves query performance by evaluating auth.uid() once per query
-- instead of once per row.
--
-- Performance Impact:
-- - Before: auth.uid() called for EVERY row (N calls for N rows)
-- - After: (SELECT auth.uid()) called ONCE per query (1 call total)
--
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

BEGIN;

-- ==============================================
-- PROFILES
-- ==============================================
DROP POLICY IF EXISTS "Users own profile" ON profiles;
CREATE POLICY "Users own profile" ON profiles
  FOR ALL USING ((SELECT auth.uid()) = id);

-- ==============================================
-- WORKOUTS
-- ==============================================
DROP POLICY IF EXISTS "Users own workouts" ON workouts;
CREATE POLICY "Users own workouts" ON workouts
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- WORKOUT_EXERCISES
-- ==============================================
DROP POLICY IF EXISTS "Users own workout exercises" ON workout_exercises;
CREATE POLICY "Users own workout exercises" ON workout_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_exercises.workout_id
      AND w.user_id = (SELECT auth.uid())
    )
  );

-- ==============================================
-- WORKOUT_SETS
-- ==============================================
DROP POLICY IF EXISTS "Users own workout sets" ON workout_sets;
CREATE POLICY "Users own workout sets" ON workout_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id
      AND w.user_id = (SELECT auth.uid())
    )
  );

-- ==============================================
-- WORKOUT_TEMPLATES
-- ==============================================
DROP POLICY IF EXISTS "Users own templates" ON workout_templates;
CREATE POLICY "Users own templates" ON workout_templates
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- TEMPLATE_EXERCISES
-- ==============================================
DROP POLICY IF EXISTS "Users own template exercises" ON template_exercises;
CREATE POLICY "Users own template exercises" ON template_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_templates t
      WHERE t.id = template_exercises.template_id
      AND t.user_id = (SELECT auth.uid())
    )
  );

-- ==============================================
-- TEMPLATE_SETS
-- ==============================================
DROP POLICY IF EXISTS "Users own template sets" ON template_sets;
CREATE POLICY "Users own template sets" ON template_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM template_exercises te
      JOIN workout_templates t ON t.id = te.template_id
      WHERE te.id = template_sets.template_exercise_id
      AND t.user_id = (SELECT auth.uid())
    )
  );

-- ==============================================
-- TEMPLATE_FOLDERS
-- ==============================================
DROP POLICY IF EXISTS "Users own template folders" ON template_folders;
CREATE POLICY "Users own template folders" ON template_folders
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- PERSONAL_RECORDS
-- ==============================================
DROP POLICY IF EXISTS "Users own personal records" ON personal_records;
CREATE POLICY "Users own personal records" ON personal_records
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- BODY_WEIGHT_LOG
-- ==============================================
DROP POLICY IF EXISTS "Users own weight log" ON body_weight_log;
CREATE POLICY "Users own weight log" ON body_weight_log
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- BODY_MEASUREMENTS
-- ==============================================
DROP POLICY IF EXISTS "Users own measurements" ON body_measurements;
CREATE POLICY "Users own measurements" ON body_measurements
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- PROGRESS_PHOTOS
-- ==============================================
DROP POLICY IF EXISTS "Users own progress photos" ON progress_photos;
CREATE POLICY "Users own progress photos" ON progress_photos
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- WEIGHT_GOALS
-- ==============================================
DROP POLICY IF EXISTS "Users own weight goals" ON weight_goals;
CREATE POLICY "Users own weight goals" ON weight_goals
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- EXERCISES (Read-only for all authenticated users)
-- ==============================================
DROP POLICY IF EXISTS "Authenticated users can view exercises" ON exercises;
CREATE POLICY "Authenticated users can view exercises" ON exercises
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- ==============================================
-- EXERCISE_FAVORITES
-- ==============================================
DROP POLICY IF EXISTS "Users manage own favorites" ON exercise_favorites;
CREATE POLICY "Users manage own favorites" ON exercise_favorites
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- CUSTOM_EXERCISES
-- ==============================================
DROP POLICY IF EXISTS "Users can view own custom exercises" ON custom_exercises;
CREATE POLICY "Users can view own custom exercises" ON custom_exercises
  FOR SELECT USING ((SELECT auth.uid()) = user_id OR status = 'approved');

DROP POLICY IF EXISTS "Users can insert own custom exercises" ON custom_exercises;
CREATE POLICY "Users can insert own custom exercises" ON custom_exercises
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own custom exercises" ON custom_exercises;
CREATE POLICY "Users can update own custom exercises" ON custom_exercises
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own custom exercises" ON custom_exercises;
CREATE POLICY "Users can delete own custom exercises" ON custom_exercises
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all custom exercises" ON custom_exercises;
CREATE POLICY "Admins can view all custom exercises" ON custom_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = (SELECT auth.uid())
      AND u.email IN ('admin@gymtracker.com', 'daggunatiprasanthmurthy@gmail.com')
    )
  );

DROP POLICY IF EXISTS "Admins can update custom exercises" ON custom_exercises;
CREATE POLICY "Admins can update custom exercises" ON custom_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = (SELECT auth.uid())
      AND u.email IN ('admin@gymtracker.com', 'daggunatiprasanthmurthy@gmail.com')
    )
  );

-- ==============================================
-- EXERCISE_NOTES
-- ==============================================
DROP POLICY IF EXISTS "Users can view own notes" ON exercise_notes;
CREATE POLICY "Users can view own notes" ON exercise_notes
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own notes" ON exercise_notes;
CREATE POLICY "Users can insert own notes" ON exercise_notes
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notes" ON exercise_notes;
CREATE POLICY "Users can update own notes" ON exercise_notes
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own notes" ON exercise_notes;
CREATE POLICY "Users can delete own notes" ON exercise_notes
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- COACH_MESSAGES
-- ==============================================
DROP POLICY IF EXISTS "Users can manage own coach messages" ON coach_messages;
CREATE POLICY "Users can manage own coach messages" ON coach_messages
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- DAILY_CHECKINS
-- ==============================================
DROP POLICY IF EXISTS "Users own daily checkins" ON daily_checkins;
CREATE POLICY "Users own daily checkins" ON daily_checkins
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- FITNESS_PREFERENCES
-- ==============================================
DROP POLICY IF EXISTS "Users own fitness preferences" ON fitness_preferences;
CREATE POLICY "Users own fitness preferences" ON fitness_preferences
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- EQUIPMENT_PREFERENCES
-- ==============================================
DROP POLICY IF EXISTS "Users own equipment preferences" ON equipment_preferences;
CREATE POLICY "Users own equipment preferences" ON equipment_preferences
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- USER_INJURIES
-- ==============================================
DROP POLICY IF EXISTS "Users own injuries" ON user_injuries;
CREATE POLICY "Users own injuries" ON user_injuries
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- USER_DEVICES
-- ==============================================
DROP POLICY IF EXISTS "Users own devices" ON user_devices;
CREATE POLICY "Users own devices" ON user_devices
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- USER_ACHIEVEMENTS
-- ==============================================
DROP POLICY IF EXISTS "Users own achievements" ON user_achievements;
CREATE POLICY "Users own achievements" ON user_achievements
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- NOTIFICATIONS
-- ==============================================
DROP POLICY IF EXISTS "Users own notifications" ON notifications;
CREATE POLICY "Users own notifications" ON notifications
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- AI_USAGE_LOGS
-- ==============================================
DROP POLICY IF EXISTS "Users can view own usage" ON ai_usage_logs;
CREATE POLICY "Users can view own usage" ON ai_usage_logs
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own usage" ON ai_usage_logs;
CREATE POLICY "Users can insert own usage" ON ai_usage_logs
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- ==============================================
-- AI_FEEDBACK
-- ==============================================
DROP POLICY IF EXISTS "Users own AI feedback" ON ai_feedback;
CREATE POLICY "Users own AI feedback" ON ai_feedback
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- AI_QUALITY_LOGS (Admin + Service)
-- ==============================================
DROP POLICY IF EXISTS "Admins can view all quality logs" ON ai_quality_logs;
CREATE POLICY "Admins can view all quality logs" ON ai_quality_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = (SELECT auth.uid())
      AND u.email IN ('admin@gymtracker.com', 'daggunatiprasanthmurthy@gmail.com')
    )
  );

DROP POLICY IF EXISTS "Users can view own quality logs" ON ai_quality_logs;
CREATE POLICY "Users can view own quality logs" ON ai_quality_logs
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Service can insert quality logs" ON ai_quality_logs;
CREATE POLICY "Service can insert quality logs" ON ai_quality_logs
  FOR INSERT WITH CHECK (true);

-- ==============================================
-- AI_QUALITY_ALERTS (Admin + Service)
-- ==============================================
DROP POLICY IF EXISTS "Admins can view all alerts" ON ai_quality_alerts;
CREATE POLICY "Admins can view all alerts" ON ai_quality_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = (SELECT auth.uid())
      AND u.email IN ('admin@gymtracker.com', 'daggunatiprasanthmurthy@gmail.com')
    )
  );

DROP POLICY IF EXISTS "Admins can update alerts" ON ai_quality_alerts;
CREATE POLICY "Admins can update alerts" ON ai_quality_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = (SELECT auth.uid())
      AND u.email IN ('admin@gymtracker.com', 'daggunatiprasanthmurthy@gmail.com')
    )
  );

DROP POLICY IF EXISTS "Service can insert alerts" ON ai_quality_alerts;
CREATE POLICY "Service can insert alerts" ON ai_quality_alerts
  FOR INSERT WITH CHECK (true);

-- ==============================================
-- STORAGE POLICIES (Supabase Storage)
-- ==============================================

-- Progress Photos
DROP POLICY IF EXISTS "Users can upload own progress photos" ON storage.objects;
CREATE POLICY "Users can upload own progress photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can view own progress photos" ON storage.objects;
CREATE POLICY "Users can view own progress photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete own progress photos" ON storage.objects;
CREATE POLICY "Users can delete own progress photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Avatars
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can view own avatar" ON storage.objects;
CREATE POLICY "Users can view own avatar" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Backups
DROP POLICY IF EXISTS "Users can upload own backups" ON storage.objects;
CREATE POLICY "Users can upload own backups" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'backups'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can view own backups" ON storage.objects;
CREATE POLICY "Users can view own backups" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'backups'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete own backups" ON storage.objects;
CREATE POLICY "Users can delete own backups" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'backups'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

COMMIT;

-- ==============================================
-- VERIFICATION
-- ==============================================
-- Run this query to verify the optimization worked:
--
-- EXPLAIN ANALYZE
-- SELECT * FROM workouts WHERE user_id = auth.uid();
--
-- You should see a significant reduction in execution time!

