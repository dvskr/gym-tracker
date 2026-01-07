-- Fix Full Body template exercises to use proper exercise UUIDs instead of fallback IDs
-- This fixes the form tips not showing for Full Body template exercises

DO $$
DECLARE
  v_user_id UUID;
  v_template_id UUID;
  v_squat_id UUID;
  v_bench_id UUID;
  v_row_id UUID;
  v_press_id UUID;
  v_rdl_id UUID;
BEGIN
  -- For each user who has a "Full Body" template
  FOR v_user_id, v_template_id IN 
    SELECT user_id, id 
    FROM workout_templates 
    WHERE name = 'Full Body'
  LOOP
    RAISE NOTICE 'Fixing Full Body template for user: %', v_user_id;
    
    -- Find exercise UUIDs by name
    SELECT id INTO v_squat_id FROM exercises WHERE name ILIKE '%barbell%squat%' OR name ILIKE 'barbell full squat' LIMIT 1;
    SELECT id INTO v_bench_id FROM exercises WHERE name ILIKE '%barbell%bench%press%' OR name ILIKE 'barbell bench press' LIMIT 1;
    SELECT id INTO v_row_id FROM exercises WHERE name ILIKE '%barbell%bent%row%' OR name ILIKE 'barbell bent over row' LIMIT 1;
    SELECT id INTO v_press_id FROM exercises WHERE name ILIKE '%dumbbell%overhead%press%' OR name ILIKE 'dumbbell standing overhead press' LIMIT 1;
    SELECT id INTO v_rdl_id FROM exercises WHERE name ILIKE '%barbell%romanian%deadlift%' OR name ILIKE 'barbell romanian deadlift' LIMIT 1;
    
    -- Update each exercise in the template with the correct UUID
    IF v_squat_id IS NOT NULL THEN
      UPDATE template_exercises 
      SET exercise_id = v_squat_id
      WHERE template_id = v_template_id 
        AND order_index = 0;
      RAISE NOTICE 'Updated squat exercise to: %', v_squat_id;
    END IF;
    
    IF v_bench_id IS NOT NULL THEN
      UPDATE template_exercises 
      SET exercise_id = v_bench_id
      WHERE template_id = v_template_id 
        AND order_index = 1;
      RAISE NOTICE 'Updated bench press exercise to: %', v_bench_id;
    END IF;
    
    IF v_row_id IS NOT NULL THEN
      UPDATE template_exercises 
      SET exercise_id = v_row_id
      WHERE template_id = v_template_id 
        AND order_index = 2;
      RAISE NOTICE 'Updated row exercise to: %', v_row_id;
    END IF;
    
    IF v_press_id IS NOT NULL THEN
      UPDATE template_exercises 
      SET exercise_id = v_press_id
      WHERE template_id = v_template_id 
        AND order_index = 3;
      RAISE NOTICE 'Updated overhead press exercise to: %', v_press_id;
    END IF;
    
    IF v_rdl_id IS NOT NULL THEN
      UPDATE template_exercises 
      SET exercise_id = v_rdl_id
      WHERE template_id = v_template_id 
        AND order_index = 4;
      RAISE NOTICE 'Updated romanian deadlift exercise to: %', v_rdl_id;
    END IF;
    
  END LOOP;
  
  RAISE NOTICE 'Full Body template fix complete';
END $$;

