import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

// Types
interface Exercise {
  id: string;
  external_id: string;
  name: string;
  description: string | null;
  instructions: string[] | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string;
  category: string;
  difficulty: string | null;
  gif_url: string | null;
}

export interface TemplateSet {
  id?: string;
  set_number: number;
  target_weight?: number;
  weight_unit?: 'lbs' | 'kg';
  target_reps: number;
  set_type: 'normal' | 'warmup' | 'dropset' | 'failure';
}

export interface TemplateExercise {
  id?: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_reps_min?: number;
  target_reps_max?: number;
  target_weight?: number;
  rest_seconds?: number;
  notes?: string;
  exercise?: Exercise; // Joined data
  sets?: TemplateSet[]; // Individual set targets
}

export interface Template {
  id?: string;
  user_id: string;
  name: string;
  description?: string;
  target_muscles?: string[];
  estimated_duration?: number;
  times_used?: number;
  last_used_at?: string;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
  exercises?: TemplateExercise[];
}

// Create template from scratch
export async function createTemplate(template: Template): Promise<Template> {
  const { exercises, ...templateData } = template;
  
  // 1. Insert template
  const { data: newTemplate, error: templateError } = await supabase
    .from('workout_templates')
    .insert({
      user_id: templateData.user_id,
      name: templateData.name,
      description: templateData.description,
      target_muscles: templateData.target_muscles || [],
      estimated_duration: templateData.estimated_duration,
    })
    .select()
    .single();

  if (templateError) throw templateError;

  // 2. Insert exercises with their sets
  if (exercises && exercises.length > 0) {
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      
      // Insert template exercise
      const { data: templateExercise, error: exerciseError } = await supabase
        .from('template_exercises')
        .insert({
          template_id: newTemplate.id,
          exercise_id: ex.exercise_id,
          order_index: i,
          target_sets: ex.sets?.length || ex.target_sets || 3,
          target_reps_min: ex.target_reps_min,
          target_reps_max: ex.target_reps_max,
          rest_seconds: ex.rest_seconds || 90,
          notes: ex.notes,
        })
        .select()
        .single();

      if (exerciseError) throw exerciseError;

      // Insert individual sets if provided (table may not exist yet)
      if (ex.sets && ex.sets.length > 0) {
        const setsToInsert = ex.sets.map((set) => ({
          template_exercise_id: templateExercise.id,
          set_number: set.set_number,
          target_weight: set.target_weight,
          weight_unit: set.weight_unit || 'lbs',
          target_reps: set.target_reps,
          set_type: set.set_type || 'normal',
        }));

        const { error: setsError } = await supabase
          .from('template_sets')
          .insert(setsToInsert);

        // Silently ignore if table doesn't exist
        if (setsError && setsError.code !== '42P01' && !setsError.message?.includes('does not exist')) {
 logger.warn('Could not save template sets:', setsError.message);
        }
      }
    }
  }

  return { ...newTemplate, exercises };
}

// Create template from completed workout
export async function createTemplateFromWorkout(
  userId: string,
  name: string,
  workoutExercises: Array<{
    exercise_id: string;
    sets: Array<{ weight: number; reps: number; set_type?: string }>;
  }>
): Promise<Template> {
  const exercises: TemplateExercise[] = workoutExercises.map((ex, index) => ({
    exercise_id: ex.exercise_id,
    order_index: index,
    target_sets: ex.sets.length,
    target_reps_min: Math.min(...ex.sets.map(s => s.reps)),
    target_reps_max: Math.max(...ex.sets.map(s => s.reps)),
    target_weight: ex.sets[0]?.weight,
    sets: ex.sets.map((s, setIndex) => ({
      set_number: setIndex + 1,
      target_weight: s.weight,
      target_reps: s.reps,
      set_type: (s.set_type as TemplateSet['set_type']) || 'normal',
    })),
  }));

  return createTemplate({
    user_id: userId,
    name,
    exercises,
  });
}

// Get all templates for user
export async function getTemplates(userId: string): Promise<Template[]> {
  // Query without template_sets (table may not exist yet)
  const { data, error } = await supabase
    .from('workout_templates')
    .select(`
      *,
      template_exercises (
        *,
        exercises (*)
      )
    `)
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  interface TemplateRow {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    target_muscles: string[] | null;
    estimated_duration: number | null;
    times_used: number;
    last_used_at: string | null;
    is_archived: boolean;
    created_at: string;
    updated_at: string | null;
    template_exercises: Array<{
      id: string;
      template_id: string;
      exercise_id: string;
      order_index: number;
      target_sets: number;
      target_reps_min: number | null;
      target_reps_max: number | null;
      rest_seconds: number | null;
      notes: string | null;
      exercises: Exercise;
    }>;
  }

  // Try to fetch sets separately for each template exercise
  const templates = await Promise.all((data || []).map(async (t: TemplateRow) => {
    const exercises = await Promise.all((t.template_exercises || [])
      .sort((a, b) => a.order_index - b.order_index)
      .map(async (te) => {
        // Try to fetch sets (will fail silently if table doesn't exist)
        let sets: TemplateSet[] = [];
        const { data: setsData, error: setsError } = await supabase
          .from('template_sets')
          .select('*')
          .eq('template_exercise_id', te.id)
          .order('set_number', { ascending: true });
        
        // Only use sets if no error (table exists)
        if (!setsError) {
          sets = setsData || [];
        }

        return {
          ...te,
          exercise: te.exercises,
          sets,
        };
      }));

    return {
      ...t,
      exercises,
    };
  }));

  return templates;
}

// Get single template by ID
export async function getTemplateById(templateId: string): Promise<Template> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select(`
      *,
      template_exercises (
        *,
        exercises (*)
      )
    `)
    .eq('id', templateId)
    .single();

  if (error) throw error;

  interface TemplateExerciseRow {
    id: string;
    order_index: number;
    exercises: Exercise;
    target_sets: number;
    target_reps_min: number | null;
    target_reps_max: number | null;
    rest_seconds: number | null;
    notes: string | null;
  }

  // Fetch sets for each exercise separately
  const exercises = await Promise.all((data.template_exercises || [])
    .sort((a: TemplateExerciseRow, b: TemplateExerciseRow) => a.order_index - b.order_index)
    .map(async (te: TemplateExerciseRow) => {
      let sets: TemplateSet[] = [];
      const { data: setsData, error: setsError } = await supabase
        .from('template_sets')
        .select('*')
        .eq('template_exercise_id', te.id)
        .order('set_number', { ascending: true });
      
      // Only use sets if no error (table exists)
      if (!setsError) {
        sets = setsData || [];
      }

      return {
        ...te,
        exercise: te.exercises,
        sets,
      };
    }));

  return {
    ...data,
    exercises,
  };
}

// Update template
export async function updateTemplate(
  templateId: string, 
  updates: Partial<Template>
): Promise<void> {
  const { error } = await supabase
    .from('workout_templates')
    .update({
      name: updates.name,
      description: updates.description,
      target_muscles: updates.target_muscles,
      estimated_duration: updates.estimated_duration,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId);

  if (error) throw error;
}

// Update template exercises with sets
export async function updateTemplateExercises(
  templateId: string,
  exercises: TemplateExercise[]
): Promise<void> {
  // 1. Delete existing template exercises (cascades to sets)
  const { error: deleteError } = await supabase
    .from('template_exercises')
    .delete()
    .eq('template_id', templateId);

  if (deleteError) throw deleteError;

  // 2. Insert new exercises with sets
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    
    const { data: templateExercise, error: exerciseError } = await supabase
      .from('template_exercises')
      .insert({
        template_id: templateId,
        exercise_id: ex.exercise_id,
        order_index: i,
        target_sets: ex.sets?.length || ex.target_sets || 3,
        target_reps_min: ex.target_reps_min,
        target_reps_max: ex.target_reps_max,
        rest_seconds: ex.rest_seconds || 90,
        notes: ex.notes,
      })
      .select()
      .single();

    if (exerciseError) throw exerciseError;

    if (ex.sets && ex.sets.length > 0) {
      const setsToInsert = ex.sets.map((set) => ({
        template_exercise_id: templateExercise.id,
        set_number: set.set_number,
        target_weight: set.target_weight,
        weight_unit: set.weight_unit || 'lbs',
        target_reps: set.target_reps,
        set_type: set.set_type || 'normal',
      }));

      const { error: setsError } = await supabase
        .from('template_sets')
        .insert(setsToInsert);

      // Silently ignore if table doesn't exist
      if (setsError && setsError.code !== '42P01' && !setsError.message?.includes('does not exist')) {
 logger.warn('Could not save template sets:', setsError.message);
      }
    }
  }
}

// Delete template
export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('workout_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

// Archive template (soft delete)
export async function archiveTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('workout_templates')
    .update({ is_archived: true })
    .eq('id', templateId);

  if (error) throw error;
}

// Increment times used
export async function incrementTemplateUsage(templateId: string): Promise<void> {
  const { data: current } = await supabase
    .from('workout_templates')
    .select('times_used')
    .eq('id', templateId)
    .single();

  const { error } = await supabase
    .from('workout_templates')
    .update({ 
      times_used: (current?.times_used || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', templateId);

  if (error) throw error;
}

// Duplicate template
export async function duplicateTemplate(templateId: string): Promise<Template> {
  const original = await getTemplateById(templateId);

  if (!original) {
    throw new Error('Template not found');
  }

  const copy = await createTemplate({
    user_id: original.user_id,
    name: `${original.name} (Copy)`,
    description: original.description,
    target_muscles: original.target_muscles,
    estimated_duration: original.estimated_duration,
    exercises: (original.exercises || []).map((ex) => ({
      exercise_id: ex.exercise_id,
      order_index: ex.order_index,
      target_sets: ex.target_sets,
      target_reps_min: ex.target_reps_min,
      target_reps_max: ex.target_reps_max,
      target_weight: ex.target_weight,
      rest_seconds: ex.rest_seconds,
      notes: ex.notes,
      sets: ex.sets, // Include individual sets
    })),
  });

  return copy;
}
