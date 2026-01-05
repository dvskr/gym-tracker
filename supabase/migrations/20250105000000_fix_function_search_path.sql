-- Fix all functions by adding SET search_path = ''
-- This prevents SQL injection via search_path manipulation
-- See: https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY

-- ============================================
-- 1. handle_new_user (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW());
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. update_updated_at_column
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 3. update_template_updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_template_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.workout_templates
  SET updated_at = NOW()
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$;

-- ============================================
-- 4. update_custom_exercises_updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_custom_exercises_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 5. update_exercise_notes_updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_exercise_notes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 6. update_daily_checkins_updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_daily_checkins_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 7. update_user_injuries_updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_user_injuries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 8. increment_custom_exercise_usage
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_custom_exercise_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.custom_exercises
  SET times_used = times_used + 1
  WHERE id = NEW.exercise_id;
  RETURN NEW;
END;
$$;

-- ============================================
-- 9. update_unique_users_count
-- ============================================
CREATE OR REPLACE FUNCTION public.update_unique_users_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.custom_exercises
  SET 
    unique_users_count = (
      SELECT COUNT(DISTINCT user_id)
      FROM public.workout_exercises
      WHERE exercise_id = NEW.exercise_id
    )
  WHERE id = NEW.exercise_id;
  RETURN NEW;
END;
$$;

-- ============================================
-- 10. is_admin (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN user_email IN (
    'admin@gymtracker.com',
    'daggunatiprasanthmurthy@gmail.com'
  );
END;
$$;

-- ============================================
-- 11. can_use_ai
-- ============================================
CREATE OR REPLACE FUNCTION public.can_use_ai(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requests_today INT;
  last_reset_date DATE;
  current_date DATE;
BEGIN
  current_date := CURRENT_DATE;
  
  SELECT 
    COALESCE(ai_requests_today, 0),
    ai_requests_today_date
  INTO requests_today, last_reset_date
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Reset counter if it's a new day
  IF last_reset_date IS NULL OR last_reset_date < current_date THEN
    RETURN TRUE;
  END IF;
  
  -- Check if under limit (50 requests per day)
  RETURN requests_today < 50;
END;
$$;

-- ============================================
-- 12. log_ai_usage
-- ============================================
CREATE OR REPLACE FUNCTION public.log_ai_usage(
  p_user_id UUID,
  p_feature_type TEXT,
  p_prompt_tokens INT,
  p_completion_tokens INT,
  p_total_tokens INT,
  p_model TEXT,
  p_response_time_ms INT,
  p_success BOOLEAN,
  p_feedback_score INT DEFAULT NULL,
  p_feedback_text TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.ai_usage_logs (
    user_id,
    feature_type,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    model,
    response_time_ms,
    success,
    feedback_score,
    feedback_text
  ) VALUES (
    p_user_id,
    p_feature_type,
    p_prompt_tokens,
    p_completion_tokens,
    p_total_tokens,
    p_model,
    p_response_time_ms,
    p_success,
    p_feedback_score,
    p_feedback_text
  );
END;
$$;

-- ============================================
-- 13. get_ai_usage_stats
-- ============================================
CREATE OR REPLACE FUNCTION public.get_ai_usage_stats(p_user_id UUID)
RETURNS TABLE (
  requests_today INT,
  requests_this_month INT,
  total_requests INT,
  can_use_ai BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.ai_requests_today, 0)::INT as requests_today,
    (
      SELECT COUNT(*)::INT
      FROM public.ai_usage_logs
      WHERE user_id = p_user_id
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    ) as requests_this_month,
    (
      SELECT COUNT(*)::INT
      FROM public.ai_usage_logs
      WHERE user_id = p_user_id
    ) as total_requests,
    public.can_use_ai(p_user_id) as can_use_ai
  FROM public.profiles p
  WHERE p.id = p_user_id;
END;
$$;

-- ============================================
-- 14. get_ai_quality_stats
-- ============================================
CREATE OR REPLACE FUNCTION public.get_ai_quality_stats(
  p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
  feature_type TEXT,
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  success_rate NUMERIC,
  avg_response_time_ms NUMERIC,
  avg_feedback_score NUMERIC,
  total_tokens BIGINT,
  avg_prompt_tokens NUMERIC,
  avg_completion_tokens NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.feature_type,
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE l.success = TRUE)::BIGINT as successful_requests,
    COUNT(*) FILTER (WHERE l.success = FALSE)::BIGINT as failed_requests,
    ROUND(
      (COUNT(*) FILTER (WHERE l.success = TRUE)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as success_rate,
    ROUND(AVG(l.response_time_ms)::NUMERIC, 2) as avg_response_time_ms,
    ROUND(AVG(l.feedback_score)::NUMERIC, 2) as avg_feedback_score,
    SUM(l.total_tokens)::BIGINT as total_tokens,
    ROUND(AVG(l.prompt_tokens)::NUMERIC, 2) as avg_prompt_tokens,
    ROUND(AVG(l.completion_tokens)::NUMERIC, 2) as avg_completion_tokens
  FROM public.ai_usage_logs l
  WHERE l.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY l.feature_type;
END;
$$;

-- ============================================
-- 15. get_recent_coach_messages
-- ============================================
CREATE OR REPLACE FUNCTION public.get_recent_coach_messages(
  p_user_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.role,
    cm.content,
    cm.metadata,
    cm.created_at
  FROM public.coach_messages cm
  WHERE cm.user_id = p_user_id
  ORDER BY cm.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- 16. get_checkin_for_date
-- ============================================
CREATE OR REPLACE FUNCTION public.get_checkin_for_date(
  p_user_id UUID,
  p_date DATE
)
RETURNS TABLE (
  id UUID,
  energy_level INT,
  soreness_level INT,
  sleep_quality INT,
  stress_level INT,
  motivation_level INT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.energy_level,
    dc.soreness_level,
    dc.sleep_quality,
    dc.stress_level,
    dc.motivation_level,
    dc.notes,
    dc.created_at,
    dc.updated_at
  FROM public.daily_checkins dc
  WHERE dc.user_id = p_user_id
    AND dc.date = p_date
  LIMIT 1;
END;
$$;

-- ============================================
-- 17. get_wellness_average
-- ============================================
CREATE OR REPLACE FUNCTION public.get_wellness_average(
  p_user_id UUID,
  p_days INT DEFAULT 7
)
RETURNS TABLE (
  avg_energy NUMERIC,
  avg_soreness NUMERIC,
  avg_sleep NUMERIC,
  avg_stress NUMERIC,
  avg_motivation NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(energy_level)::NUMERIC, 1) as avg_energy,
    ROUND(AVG(soreness_level)::NUMERIC, 1) as avg_soreness,
    ROUND(AVG(sleep_quality)::NUMERIC, 1) as avg_sleep,
    ROUND(AVG(stress_level)::NUMERIC, 1) as avg_stress,
    ROUND(AVG(motivation_level)::NUMERIC, 1) as avg_motivation
  FROM public.daily_checkins
  WHERE user_id = p_user_id
    AND date >= CURRENT_DATE - p_days
    AND date <= CURRENT_DATE;
END;
$$;

-- ============================================
-- 18. get_fitness_profile
-- ============================================
CREATE OR REPLACE FUNCTION public.get_fitness_profile(p_user_id UUID)
RETURNS TABLE (
  experience_level TEXT,
  training_frequency INT,
  session_duration INT,
  primary_goals TEXT[],
  gym_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.experience_level,
    fp.training_frequency,
    fp.session_duration,
    fp.primary_goals,
    fp.gym_type
  FROM public.fitness_preferences fp
  WHERE fp.user_id = p_user_id
  LIMIT 1;
END;
$$;

-- ============================================
-- 19. get_equipment_setup
-- ============================================
CREATE OR REPLACE FUNCTION public.get_equipment_setup(p_user_id UUID)
RETURNS TABLE (
  equipment_type TEXT,
  has_access BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ep.equipment_type,
    ep.has_access
  FROM public.equipment_preferences ep
  WHERE ep.user_id = p_user_id;
END;
$$;

-- ============================================
-- 20. has_equipment
-- ============================================
CREATE OR REPLACE FUNCTION public.has_equipment(
  p_user_id UUID,
  p_equipment TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  SELECT ep.has_access INTO has_access
  FROM public.equipment_preferences ep
  WHERE ep.user_id = p_user_id
    AND ep.equipment_type = p_equipment;
  
  RETURN COALESCE(has_access, FALSE);
END;
$$;

-- ============================================
-- 21. get_active_injuries
-- ============================================
CREATE OR REPLACE FUNCTION public.get_active_injuries(p_user_id UUID)
RETURNS TABLE (
  body_part TEXT,
  severity TEXT,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.body_part,
    ui.severity,
    ui.notes
  FROM public.user_injuries ui
  WHERE ui.user_id = p_user_id
    AND ui.is_active = TRUE;
END;
$$;

-- ============================================
-- 22. get_avoided_exercises
-- ============================================
CREATE OR REPLACE FUNCTION public.get_avoided_exercises(p_user_id UUID)
RETURNS TABLE (
  exercise_id UUID,
  exercise_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.avoided_exercise_ids,
    e.name
  FROM public.user_injuries ui
  CROSS JOIN LATERAL UNNEST(ui.avoided_exercise_ids) WITH ORDINALITY AS t(id)
  LEFT JOIN public.exercises e ON e.id = t.id
  WHERE ui.user_id = p_user_id
    AND ui.is_active = TRUE;
END;
$$;

-- ============================================
-- 23. get_avoided_movements
-- ============================================
CREATE OR REPLACE FUNCTION public.get_avoided_movements(p_user_id UUID)
RETURNS TABLE (
  movement TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.avoided_movements
  FROM public.user_injuries ui
  CROSS JOIN LATERAL UNNEST(ui.avoided_movements) WITH ORDINALITY AS t(movement)
  WHERE ui.user_id = p_user_id
    AND ui.is_active = TRUE;
END;
$$;

-- ============================================
-- 24. should_avoid_exercise
-- ============================================
CREATE OR REPLACE FUNCTION public.should_avoid_exercise(
  p_user_id UUID,
  p_exercise_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_avoided BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.user_injuries ui
    WHERE ui.user_id = p_user_id
      AND ui.is_active = TRUE
      AND p_exercise_id = ANY(ui.avoided_exercise_ids)
  ) INTO is_avoided;
  
  RETURN COALESCE(is_avoided, FALSE);
END;
$$;

-- ============================================
-- 25. apply_gym_type_preset
-- ============================================
CREATE OR REPLACE FUNCTION public.apply_gym_type_preset(
  p_user_id UUID,
  p_gym_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete existing preferences
  DELETE FROM public.equipment_preferences
  WHERE user_id = p_user_id;
  
  -- Insert preset based on gym type
  IF p_gym_type = 'full_gym' THEN
    INSERT INTO public.equipment_preferences (user_id, equipment_type, has_access)
    SELECT p_user_id, equipment_type, TRUE
    FROM (VALUES 
      ('barbell'), ('dumbbells'), ('cable'), ('machine'),
      ('bands'), ('kettlebell'), ('ez_curl_bar'), ('trap_bar')
    ) AS t(equipment_type);
    
  ELSIF p_gym_type = 'home_gym' THEN
    INSERT INTO public.equipment_preferences (user_id, equipment_type, has_access)
    SELECT p_user_id, equipment_type, TRUE
    FROM (VALUES 
      ('barbell'), ('dumbbells'), ('bands'), ('kettlebell')
    ) AS t(equipment_type);
    
  ELSIF p_gym_type = 'minimal' THEN
    INSERT INTO public.equipment_preferences (user_id, equipment_type, has_access)
    SELECT p_user_id, equipment_type, TRUE
    FROM (VALUES 
      ('dumbbells'), ('bands'), ('body_only')
    ) AS t(equipment_type);
    
  ELSIF p_gym_type = 'bodyweight' THEN
    INSERT INTO public.equipment_preferences (user_id, equipment_type, has_access)
    SELECT p_user_id, equipment_type, TRUE
    FROM (VALUES ('body_only')) AS t(equipment_type);
  END IF;
END;
$$;

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify all functions have search_path set:
-- 
-- SELECT 
--   p.proname as function_name,
--   CASE WHEN p.proconfig IS NULL THEN '❌ MISSING' 
--        WHEN 'search_path=' = ANY(p.proconfig::text[]) THEN '✅ SET (empty)'
--        ELSE '✅ SET' 
--   END as search_path_status,
--   p.proconfig as config
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public' AND p.prokind = 'f'
-- ORDER BY search_path_status, function_name;

